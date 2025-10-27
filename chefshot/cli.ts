#!/usr/bin/env node

import { Command, Option, InvalidArgumentError } from 'commander';
import { writeFile, access } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { generateApp } from './interact.js';
import { config } from 'dotenv';
import * as lz4 from 'lz4-wasm-nodejs';
// Helper for consistent logging to stderr
const log = (...args: any[]) => console.error(...args);

// Find and load the nearest .env.local file
const findAndLoadEnv = async () => {
  const cwd = process.cwd();
  const possiblePaths = [join(cwd, '.env.local'), join(dirname(cwd), '.env.local')];

  for (const path of possiblePaths) {
    try {
      await access(path);
      config({ path });
      log(`✓ Found and loaded environment from ${path}`);
      return;
    } catch {
      continue;
    }
  }
};

// Load environment before setting up the program
await findAndLoadEnv();

interface GenerateOptions {
  tuttuUrl?: string;
  prod?: boolean;
  dev?: boolean;
  localBuild?: boolean;
  outputDir?: string;
  messagesFile?: string;
  messages?: boolean;
  force?: boolean;
  headless: boolean;
}

const generateCommand = new Command('generate')
  .description('Generate an app using Tuttu AI')
  .argument('<prompt>', 'The prompt to send to Tuttu')
  // URL group - mutually exclusive options
  .addOption(
    new Option('--tuttu-url <url>', 'Custom Tuttu URL')
      .conflicts(['prod', 'dev', 'local-build'])
      .argParser((value: string) => {
        try {
          new URL(value);
          return value;
        } catch {
          throw new InvalidArgumentError('Not a valid URL');
        }
      }),
  )
  .addOption(
    new Option('--prod', 'Use production Tuttu at tuttu.convex.dev').conflicts(['tuttu-url', 'dev', 'local-build']),
  )
  .addOption(
    new Option('--dev', 'Use local dev server at http://127.0.0.1:5173').conflicts(['tuttu-url', 'prod', 'local-build']),
  )
  .addOption(
    new Option('--local-build', 'Build (if needed) and run local server at http://localhost:3000')
      .conflicts(['tuttu-url', 'prod', 'dev'])
      .default(true),
  )
  // Output directory options
  .addOption(new Option('--output-dir <dir>', 'Directory to output the generated code'))
  // Messages output group - mutually exclusive options
  .addOption(new Option('--messages-file <file>', 'File to write conversation messages to').conflicts(['messages']))
  .addOption(new Option('--messages', 'Write messages to stdout').conflicts(['messages-file']))
  // Other options
  .addOption(new Option('-f, --force', 'Overwrite output directory if it exists'))
  // Headless mode options
  .option('--headless', 'run in headless mode', true)
  .option('--no-headless', 'show browser window')
  // Hidden options
  .addOption(
    new Option('--headed', 'show browser window').hideHelp().conflicts(['no-headless']).preset({ headless: false }),
  )
  .action(async (prompt: string, options: GenerateOptions) => {
    let tuttuUrl: string;
    if (options.dev) {
      tuttuUrl = 'http://127.0.0.1:5173';
    } else if (options.prod) {
      tuttuUrl = 'https://tuttu.convex.dev';
    } else if (options.tuttuUrl) {
      tuttuUrl = options.tuttuUrl;
    } else {
      // Default to local-build behavior
      tuttuUrl = 'http://localhost:3000';
    }
    log(`Looking for Tuttu at ${tuttuUrl}`);

    // Check for required environment variables
    const email = process.env.TUTTU_EVAL_USER_EMAIL;
    const password = process.env.TUTTU_EVAL_USER_PASSWORD;

    if (!email || !password) {
      log('Error: Missing required environment variables');
      log('Please set TUTTU_EVAL_USER_EMAIL and TUTTU_EVAL_USER_PASSWORD in your .env.local file');
      process.exit(1);
    }

    // Check output directory if provided
    const outputDir = options.outputDir ? resolve(options.outputDir) : undefined;
    if (outputDir) {
      try {
        await access(outputDir);
        if (!options.force) {
          log(`Error: Output directory ${outputDir} already exists. Use --force to overwrite.`);
          process.exit(1);
        }
        log(`Warning: Output directory ${outputDir} exists, will overwrite due to --force`);
      } catch {
        // Directory doesn't exist, which is what we want
        log(`Will generate code in ${outputDir}`);
      }
    } else {
      log('No output directory specified, code will not be saved');
    }

    const { messages, outputDir: finalOutputDir } = await generateApp({
      prompt,
      tuttuUrl,
      outputDir,
      headless: options.headless,
      credentials: {
        email,
        password,
      },
    });

    // Handle messages output
    if (options.messagesFile) {
      const messagesPath = resolve(options.messagesFile);
      await writeFile(messagesPath, JSON.stringify(messages, null, 2));
      log(`Wrote messages to ${messagesPath}`);
    } else if (options.messages) {
      // Write to stdout for piping
      console.log(JSON.stringify(messages, null, 2));
    }

    if (finalOutputDir) {
      log(`Generated app in ${finalOutputDir}`);
    } else {
      log('Tip: Use --output-dir to save the generated code');
    }
  });

interface DownloadOptions {
  tuttuSiteUrl: string;
  dev?: boolean;
  prod?: boolean;
  messagesFile?: string;
  messagesRawFile?: string;
  messages?: boolean;
}

const downloadCommand = new Command('download')
  .description('Download an app using Tuttu AI')
  .argument('chatUuid', 'The UUID of the chat to download')
  // URL group - mutually exclusive options
  .addOption(
    new Option('--tuttu-site-url <url>', 'Tuttu site URL').conflicts(['prod', 'dev']).argParser((value: string) => {
      try {
        new URL(value);
        return value;
      } catch {
        throw new InvalidArgumentError('Not a valid URL');
      }
    }),
  )
  .addOption(new Option('--prod', 'Use production Tuttu database').conflicts(['tuttu-backend-url', 'dev']))
  .addOption(new Option('--dev', 'Use dev Tuttu database configured in .env.local').conflicts(['tuttu-site-url', 'prod']))
  .addOption(new Option('--messages-file <file>', 'File to write the parsed (JSON) messages to'))
  .addOption(new Option('--messages-raw-file <file>', 'File to write the compressed messages to'))
  .action(async (chatUuid: string, options: DownloadOptions) => {
    let tuttuSiteUrl: string | undefined;
    if (options.dev) {
      if (process.env.VITE_CONVEX_SITE_URL) {
        tuttuSiteUrl = process.env.VITE_CONVEX_SITE_URL;
      } else if (process.env.CONVEX_URL) {
        const convexUrl = process.env.CONVEX_URL;
        if (convexUrl.endsWith('.convex.cloud')) {
          tuttuSiteUrl = convexUrl.replace('.convex.cloud', '.convex.site');
        }
      }
    } else if (options.prod) {
      tuttuSiteUrl = 'https://academic-mammoth-217.convex.site';
    } else if (options.tuttuSiteUrl) {
      tuttuSiteUrl = options.tuttuSiteUrl;
    }
    if (!tuttuSiteUrl) {
      log('Error: Missing required environment variables');
      log('Please set CONVEX_URL in your .env.local file or run with --tuttu-site-url or --prod');
      process.exit(1);
    }
    log(`Looking for Tuttu at ${tuttuSiteUrl}`);
    const tuttuAdminToken = process.env.TUTTU_ADMIN_TOKEN;
    if (!tuttuAdminToken) {
      log('Error: Missing required environment variables');
      log('Please set TUTTU_ADMIN_TOKEN in your .env.local file');
      process.exit(1);
    }

    const response = await fetch(`${tuttuSiteUrl}/__debug/download_messages`, {
      method: 'POST',
      body: JSON.stringify({ chatUuid }),
      headers: {
        'X-Tuttu-Admin-Token': tuttuAdminToken,
      },
    });
    if (!response.ok) {
      log(`Error: ${response.statusText}`);
      process.exit(1);
    }

    const messagesBlob = await response.arrayBuffer();
    const messageBytes = new Uint8Array(messagesBlob);
    if (options.messagesRawFile) {
      const messagesPath = resolve(options.messagesRawFile);
      await writeFile(messagesPath, messageBytes);
      log(`Wrote raw messages to ${messagesPath}`);
    }
    const decompressed = await lz4.decompress(messageBytes);
    const messages = JSON.parse(new TextDecoder().decode(decompressed));
    if (options.messagesFile) {
      const messagesPath = resolve(options.messagesFile);
      await writeFile(messagesPath, JSON.stringify(messages, null, 2));
      log(`Wrote messages to ${messagesPath}`);
    } else {
      // Write to stdout for piping
      console.log(JSON.stringify(messages, null, 2));
    }
  });

const program = new Command();

program.name('tuttushot').description('Tuttu AI CLI').addCommand(generateCommand).addCommand(downloadCommand);

program.parse();
