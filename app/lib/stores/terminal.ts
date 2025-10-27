import type { WebContainer, WebContainerProcess } from '@webcontainer/api';
import { atom, type WritableAtom } from 'nanostores';
import type { ITerminal, TerminalInitializationOptions } from '~/types/terminal';
import { newBoltShellProcess, newShellProcess } from '~/utils/shell';
import { coloredText } from '~/utils/terminal';
import { workbenchStore } from './workbench.client';
import {
  activeTerminalTabStore,
  CONVEX_DEPLOY_TAB_INDEX,
  isConvexDeployTerminalVisibleStore,
  VITE_TAB_INDEX,
} from './terminalTabs';
import { toast } from 'sonner';
import { ContainerBootState, waitForBootStepCompleted } from './containerBootState';

export class TerminalStore {
  #webcontainer: Promise<WebContainer>;
  #terminals: Array<{ terminal: ITerminal; process: WebContainerProcess }> = [];
  #boltTerminal = newBoltShellProcess();
  #deployTerminal = newBoltShellProcess();
  showTerminal: WritableAtom<boolean> = import.meta.hot?.data.showTerminal ?? atom(true);

  startDevServerOnAttach = false;

  constructor(webcontainerPromise: Promise<WebContainer>) {
    this.#webcontainer = webcontainerPromise;

    if (import.meta.hot) {
      import.meta.hot.data.showTerminal = this.showTerminal;
    }
  }
  get boltTerminal() {
    return this.#boltTerminal;
  }

  toggleTerminal(value?: boolean) {
    this.showTerminal.set(value !== undefined ? value : !this.showTerminal.get());
  }

  async attachBoltTerminal(terminal: ITerminal) {
    try {
      const wc = await this.#webcontainer;
      await this.#boltTerminal.init(wc, terminal);
      // Note -- do not start the dev server here, since it will be handled by
      // `attachDeployTerminal` and to avoid conflicts with `npx convex dev`
      // triggering this server to restart
    } catch (error: any) {
      console.error('Failed to initialize bolt terminal:', error);
      terminal.write(coloredText.red('Failed to spawn dev server shell\n\n') + error.message);
      return;
    }
  }

  async deployFunctionsAndRunDevServer(shouldDeployConvexFunctions: boolean) {
    if (shouldDeployConvexFunctions) {
      // We want all the code to be there, but do not need to wait for "READY"
      await waitForBootStepCompleted(ContainerBootState.STARTING_BACKUP);
      isConvexDeployTerminalVisibleStore.set(true);
      activeTerminalTabStore.set(CONVEX_DEPLOY_TAB_INDEX);

      await this.#deployTerminal.executeCommand('clear');
      const result = await this.#deployTerminal.executeCommand('convex dev --once');

      if (result.exitCode !== 0) {
        toast.error('Failed to deploy Convex functions. Check the terminal for more details.');
        workbenchStore.currentView.set('code');
        activeTerminalTabStore.set(CONVEX_DEPLOY_TAB_INDEX);
      } else {
        isConvexDeployTerminalVisibleStore.set(false);
        activeTerminalTabStore.set(VITE_TAB_INDEX);
        toast.success('Convex functions deployed successfully');
      }
    }

    if (!workbenchStore.isDefaultPreviewRunning()) {
      await this.#boltTerminal.executeCommand('vite --open');
    }
  }

  async attachDeployTerminal(terminal: ITerminal, options?: TerminalInitializationOptions) {
    try {
      const wc = await this.#webcontainer;
      await this.#deployTerminal.init(wc, terminal);
      if (options?.isReload) {
        await this.deployFunctionsAndRunDevServer(options.shouldDeployConvexFunctions ?? false);
      }
    } catch (error: any) {
      console.error('Failed to initialize deploy terminal:', error);
      terminal.write(coloredText.red('Failed to spawn dev server shell\n\n') + error.message);
      return;
    }
  }

  async attachTerminal(terminal: ITerminal) {
    try {
      const shellProcess = await newShellProcess(await this.#webcontainer, terminal);
      this.#terminals.push({ terminal, process: shellProcess });
    } catch (error: any) {
      terminal.write(coloredText.red('Failed to spawn shell\n\n') + error.message);
      return;
    }
  }

  onTerminalResize(cols: number, rows: number) {
    for (const { process } of this.#terminals) {
      process.resize({ cols, rows });
    }
  }
}
