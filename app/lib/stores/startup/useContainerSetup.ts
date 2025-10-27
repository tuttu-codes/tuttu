import { useEffect } from 'react';
import { ContainerBootState, setContainerBootState, waitForBootStepCompleted } from '~/lib/stores/containerBootState';
import { webcontainer } from '~/lib/webcontainer';
import { useStore } from '@nanostores/react';
import { sessionIdStore } from '~/lib/stores/sessionId';
import { api } from '@convex/_generated/api';
import type { ConvexReactClient } from 'convex/react';
import { useConvex } from 'convex/react';
import { decompressWithLz4 } from '~/lib/compression';
import { streamOutput } from '~/utils/process';
import { cleanTerminalOutput } from 'tuttu-agent/utils/shell';
import { toast } from 'sonner';
import { waitForConvexProjectConnection } from '~/lib/stores/convexProject';
import type { ConvexProject } from 'tuttu-agent/types';
import type { WebContainer } from '@webcontainer/api';
import { queryEnvVariableWithRetries, setEnvVariablesWithRetries } from 'tuttu-agent/convexEnvVariables';
import { getConvexSiteUrl } from '~/lib/convexSiteUrl';
import { workbenchStore } from '~/lib/stores/workbench.client';
import { initializeConvexAuth } from 'tuttu-agent/convexAuth';
import { appendEnvVarIfNotSet } from '~/utils/envFileUtils';
import { getFileUpdateCounter } from '~/lib/stores/fileUpdateCounter';
import { chatSyncState } from './chatSyncState';
import { FILE_EVENTS_DEBOUNCE_MS } from '~/lib/stores/files';
import { setTuttuDebugProperty } from 'tuttu-agent/utils/tuttuDebug';

const TEMPLATE_URL = '/template-snapshot-63fbe575.bin';

export function useNewChatContainerSetup() {
  const convex = useConvex();
  useEffect(() => {
    const runSetup = async () => {
      try {
        await waitForBootStepCompleted(ContainerBootState.STARTING);
        await setupContainer(convex, { snapshotUrl: TEMPLATE_URL, allowNpmInstallFailure: false });
      } catch (error: any) {
        toast.error('Failed to setup Tuttu environment. Try reloading the page.');
        setContainerBootState(ContainerBootState.ERROR, error);
      }
    };
    void runSetup();
  }, [convex]);
}

export function useExistingChatContainerSetup(loadedChatId: string | undefined) {
  const sessionId = useStore(sessionIdStore);
  const convex = useConvex();
  useEffect(() => {
    if (!sessionId) {
      return;
    }
    if (!loadedChatId) {
      return;
    }
    const runSetup = async () => {
      try {
        await waitForBootStepCompleted(ContainerBootState.STARTING);
        let snapshotUrl = await convex.query(api.snapshot.getSnapshotUrl, { chatId: loadedChatId, sessionId });
        if (!snapshotUrl) {
          console.warn(`Existing chat ${loadedChatId} has no snapshot. Loading the base template.`);
          snapshotUrl = TEMPLATE_URL;
        }
        await setupContainer(convex, { snapshotUrl, allowNpmInstallFailure: true });
      } catch (error: any) {
        toast.error('Failed to setup Tuttu environment. Try reloading the page.');
        setContainerBootState(ContainerBootState.ERROR, error);
      }
    };
    void runSetup();
  }, [convex, loadedChatId, sessionId]);
}

async function setupContainer(
  convex: ConvexReactClient,
  options: { snapshotUrl: string; allowNpmInstallFailure: boolean },
) {
  const resp = await fetch(options.snapshotUrl);
  if (!resp.ok) {
    throw new Error(`Failed to download snapshot (${resp.statusText}): ${resp.statusText}`);
  }
  const compressed = await resp.arrayBuffer();
  const decompressed = decompressWithLz4(new Uint8Array(compressed));

  const container = await webcontainer;
  await container.mount(decompressed);

  // After loading the snapshot, we need to load the files into the FilesStore since
  // we won't receive file events for snapshot files.
  await workbenchStore.prewarmWorkdir(container);

  setTuttuDebugProperty('webcontainer', container);

  setContainerBootState(ContainerBootState.DOWNLOADING_DEPENDENCIES);
  const npm = await container.spawn('npm', ['install', '--no-fund', '--no-deprecated']);
  const { output, exitCode } = await streamOutput(npm);
  console.log('NPM output', cleanTerminalOutput(output));

  if (exitCode !== 0) {
    if (options.allowNpmInstallFailure) {
      toast.error(`Failed to install dependencies. Fix your package.json and tell Tuttu to redeploy.`, {
        duration: Infinity,
      });
      console.error(`npm install failed with exit code ${exitCode}: ${output}`);
    } else {
      throw new Error(`npm install failed with exit code ${exitCode}: ${output}`);
    }
  }

  setContainerBootState(ContainerBootState.SETTING_UP_CONVEX_PROJECT);
  const convexProject = await waitForConvexProjectConnection();

  setContainerBootState(ContainerBootState.SETTING_UP_CONVEX_ENV_VARS);
  await setupConvexEnvVars(container, convexProject);
  await setupOpenAIToken(convex, convexProject);
  await setupResendToken(convex, convexProject);
  setContainerBootState(ContainerBootState.CONFIGURING_CONVEX_AUTH);
  await initializeConvexAuth(convexProject);

  setContainerBootState(ContainerBootState.STARTING_BACKUP);
  await initializeFileSystemBackup();

  setContainerBootState(ContainerBootState.READY);
}

async function initializeFileSystemBackup() {
  // This is a bit racy, but we need to flush the current file events before
  // deciding that we're synced up to the current update counter. Sleep for
  // twice the batching interval.
  await new Promise((resolve) => setTimeout(resolve, FILE_EVENTS_DEBOUNCE_MS * 2));
  const currentChatSyncState = chatSyncState.get();
  if (currentChatSyncState.savedFileUpdateCounter === null) {
    const fileUpdateCounter = getFileUpdateCounter();
    chatSyncState.set({
      ...currentChatSyncState,
      savedFileUpdateCounter: fileUpdateCounter,
    });
  }
}

async function setupConvexEnvVars(webcontainer: WebContainer, convexProject: ConvexProject) {
  const { token } = convexProject;
  await appendEnvVarIfNotSet({
    envFilePath: '.env.local',
    readFile: (path) => webcontainer.fs.readFile(path, 'utf-8'),
    writeFile: (path, content) => webcontainer.fs.writeFile(path, content),
    envVarName: 'CONVEX_DEPLOY_KEY',
    value: token,
  });
}

async function setupOpenAIToken(convex: ConvexReactClient, project: ConvexProject) {
  const existing = await queryEnvVariableWithRetries(project, 'CONVEX_OPENAI_API_KEY');
  if (existing) {
    return;
  }
  const token = await convex.mutation(api.openaiProxy.issueOpenAIToken);
  if (token) {
    await setEnvVariablesWithRetries(project, {
      CONVEX_OPENAI_API_KEY: token,
      CONVEX_OPENAI_BASE_URL: getConvexSiteUrl() + '/openai-proxy',
    });
  }
}

async function setupResendToken(convex: ConvexReactClient, project: ConvexProject) {
  const existing = await queryEnvVariableWithRetries(project, 'CONVEX_RESEND_API_KEY');
  if (existing) {
    return;
  }
  const token = await convex.mutation(api.resendProxy.issueResendToken);
  if (token) {
    await setEnvVariablesWithRetries(project, {
      CONVEX_RESEND_API_KEY: token,
      RESEND_BASE_URL: getConvexSiteUrl() + '/resend-proxy',
    });
  }
}
