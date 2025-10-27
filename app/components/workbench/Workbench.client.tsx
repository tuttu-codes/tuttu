import { useStore } from '@nanostores/react';
import { motion, type HTMLMotionProps, type Variants } from 'framer-motion';
import { computed } from 'nanostores';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  type OnChangeCallback as OnEditorChange,
  type OnScrollCallback as OnEditorScroll,
  type OnWheelCallback as OnEditorWheel,
} from '~/components/editor/codemirror/CodeMirrorEditor';
import { IconButton } from '~/components/ui/IconButton';
import { PanelHeaderButton } from '~/components/ui/PanelHeaderButton';
import { Slider, type SliderOptions } from '~/components/ui/Slider';
import { workbenchStore, type WorkbenchViewType } from '~/lib/stores/workbench.client';
import { classNames } from '~/utils/classNames';
import { cubicEasingFn } from '~/utils/easings';
import { renderLogger } from 'tuttu-agent/utils/logger';
import { EditorPanel } from './EditorPanel';
import { Preview } from './Preview';
import useViewport from '~/lib/hooks/useViewport';
import { Dashboard } from './Dashboard';
import { Allotment } from 'allotment';
import { convexProjectStore } from '~/lib/stores/convexProject';
import { BackupStatusIndicator } from '~/components/BackupStatusIndicator';
import type { TerminalInitializationOptions } from '~/types/terminal';
import { getAbsolutePath } from 'tuttu-agent/utils/workDir';
import { PlusIcon, Cross2Icon } from '@radix-ui/react-icons';
import { CommandLineIcon } from '@heroicons/react/24/outline';

interface WorkspaceProps {
  chatStarted?: boolean;
  isStreaming?: boolean;
  terminalInitializationOptions?: TerminalInitializationOptions;
}

const viewTransition = { ease: cubicEasingFn };

const workbenchVariants = {
  closed: {
    width: 0,
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
  open: {
    width: 'var(--workbench-width)',
    transition: {
      duration: 0.2,
      ease: cubicEasingFn,
    },
  },
} satisfies Variants;

export const Workbench = memo(function Workbench({
  chatStarted,
  isStreaming,
  terminalInitializationOptions,
}: WorkspaceProps) {
  renderLogger.trace('Workbench');

  // const modifiedFiles = Array.from(useStore(workbenchStore.unsavedFiles).keys());

  const hasPreview = useStore(computed(workbenchStore.previews, (previews) => previews.length > 0));
  const showWorkbench = useStore(workbenchStore.showWorkbench);
  const selectedFile = useStore(workbenchStore.selectedFile);
  const currentDocument = useStore(workbenchStore.currentDocument);
  const unsavedFiles = useStore(workbenchStore.unsavedFiles);
  const files = useStore(workbenchStore.files);
  const selectedView = useStore(workbenchStore.currentView);

  const following = useStore(workbenchStore.followingStreamedCode);

  const isSmallViewport = useViewport(1024);

  const [previewPanes, setPreviewPanes] = useState<string[]>(() => [randomId()]);

  const setSelectedView = (view: WorkbenchViewType) => {
    workbenchStore.currentView.set(view);
  };

  useEffect(() => {
    if (hasPreview) {
      setSelectedView('preview');
    }
  }, [hasPreview]);

  useEffect(() => {
    workbenchStore.setDocuments(files);
  }, [files]);
  const currentDocumentPath = currentDocument?.filePath;

  const onEditorChange = useCallback<OnEditorChange>(
    (update) => {
      // This is called debounced, so it's not fair to use it to update
      // the current doc: we don't actually know which files it's for!

      const updateAbsPath = getAbsolutePath(update.filePath);
      if (currentDocumentPath !== updateAbsPath) {
        console.log(
          `onEditorChange fired for what is no longer the current document, changed: ${updateAbsPath} current: ${currentDocumentPath}`,
        );
        return;
      }

      workbenchStore.setCurrentDocumentContent(update.content);
    },
    [currentDocumentPath],
  );

  const onEditorScroll = useCallback<OnEditorScroll>((position) => {
    workbenchStore.setCurrentDocumentScrollPosition(position);
  }, []);

  const onEditorWheel = useCallback<OnEditorWheel>(() => {
    workbenchStore.stopFollowingStreamedCode();
  }, []);

  const onFileSelect = useCallback((filePath: string | undefined) => {
    workbenchStore.followingStreamedCode.set(false);
    const absPath = filePath ? getAbsolutePath(filePath) : undefined;
    workbenchStore.setSelectedFile(absPath);
  }, []);

  const onFileSave = useCallback(() => {
    workbenchStore.saveCurrentDocument().catch((err) => {
      console.error('Failed to update file content', err);
      toast.error('Failed to update file content');
    });
  }, []);

  const onFileReset = useCallback(() => {
    workbenchStore.resetCurrentDocument();
  }, []);

  const showDashboard = useStore(convexProjectStore) !== null;

  const sliderOptions: SliderOptions<WorkbenchViewType> = useMemo(
    () => ({
      options: [
        {
          value: 'code',
          text: 'Code',
        },
        {
          value: 'preview',
          text: 'Preview',
        },
        ...(showDashboard
          ? [
              {
                value: 'dashboard' as const,
                text: (
                  <>
                    <img className="size-4" height="16" width="16" src="/icons/Convex.svg" alt="Convex" />
                    Database
                  </>
                ),
              },
            ]
          : []),
      ],
    }),
    [showDashboard],
  );

  // TODO get rid of fileHistory since we don't use it
  const fileHistory = useMemo(() => ({}), []);

  return (
    chatStarted && (
      <>
        <motion.div
          initial="closed"
          animate={showWorkbench ? 'open' : 'closed'}
          variants={workbenchVariants}
          className="z-workbench"
        >
          <div
            className={classNames(
              'fixed top-[calc(var(--header-height)+1rem)] bottom-four w-[var(--workbench-inner-width)] z-0 transition-[left,width] duration-200 bolt-ease-cubic-bezier',
              {
                'w-full': isSmallViewport,
                'left-0': showWorkbench && isSmallViewport,
                'left-[var(--workbench-left)]': showWorkbench && !isSmallViewport,
                'left-[100%]': !showWorkbench,
              },
            )}
          >
            <div className="absolute inset-0 px-2 lg:px-6">
              <div className="flex h-full flex-col overflow-hidden rounded-lg border bg-bolt-elements-background-depth-2 shadow">
                <div className="flex items-center border-b px-3 py-2">
                  <Slider selected={selectedView} options={sliderOptions} setSelected={setSelectedView} />
                  <div className="ml-auto" />
                  {selectedView === 'code' && (
                    <div className="flex overflow-y-auto">
                      <BackupStatusIndicator />
                      <div className="w-4" />
                      <PanelHeaderButton
                        className="mr-1 text-sm"
                        onClick={() => {
                          workbenchStore.toggleTerminal(!workbenchStore.showTerminal.get());
                        }}
                      >
                        <CommandLineIcon className="size-4" />
                        Toggle Terminal
                      </PanelHeaderButton>
                    </div>
                  )}
                  {selectedView === 'preview' && (
                    <PanelHeaderButton
                      className="mr-1 text-sm"
                      onClick={() => {
                        setPreviewPanes([...previewPanes, randomId()]);
                      }}
                    >
                      <PlusIcon />
                      Add Preview
                    </PanelHeaderButton>
                  )}
                  <IconButton
                    icon={<Cross2Icon />}
                    className="-mr-1"
                    size="xl"
                    onClick={() => {
                      workbenchStore.showWorkbench.set(false);
                    }}
                  />
                </div>
                <div className="relative flex-1 overflow-hidden">
                  <View {...slidingPosition({ view: 'code', selectedView, showDashboard })}>
                    <EditorPanel
                      editorDocument={currentDocument}
                      isStreaming={isStreaming}
                      scrollToDocAppend={following && isStreaming}
                      selectedFile={selectedFile}
                      files={files}
                      unsavedFiles={unsavedFiles}
                      fileHistory={fileHistory}
                      onFileSelect={onFileSelect}
                      onEditorScroll={onEditorScroll}
                      onEditorWheel={onEditorWheel}
                      onEditorChange={onEditorChange}
                      onFileSave={onFileSave}
                      onFileReset={onFileReset}
                      terminalInitializationOptions={terminalInitializationOptions}
                    />
                  </View>
                  <View {...slidingPosition({ view: 'preview', selectedView, showDashboard })}>
                    <Allotment vertical minSize={150}>
                      {previewPanes.map((paneId) => (
                        <Preview
                          key={paneId}
                          showClose={previewPanes.length > 1}
                          onClose={() => {
                            setPreviewPanes(previewPanes.filter((id) => id !== paneId));
                          }}
                        />
                      ))}
                    </Allotment>
                  </View>
                  {showDashboard && (
                    <View {...slidingPosition({ view: 'dashboard', selectedView, showDashboard })}>
                      <Dashboard />
                    </View>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </>
    )
  );
});

// View component for rendering content with motion transitions
interface ViewProps extends HTMLMotionProps<'div'> {
  children: JSX.Element;
}

const View = memo(function View({ children, ...props }: ViewProps) {
  return (
    <motion.div className="absolute inset-0" transition={viewTransition} {...props}>
      {children}
    </motion.div>
  );
});

function slidingPosition({
  view,
  selectedView,
  showDashboard,
}: {
  view: WorkbenchViewType;
  selectedView: WorkbenchViewType;
  showDashboard: boolean;
}) {
  const tabsInOrder: WorkbenchViewType[] = ['code', 'preview', ...(showDashboard ? ['dashboard' as const] : [])];

  const viewIndex = tabsInOrder.indexOf(view);
  const selectedViewIndex = tabsInOrder.indexOf(selectedView);

  const position = { x: `${(viewIndex - selectedViewIndex) * 100}%` };

  return {
    initial: position,
    animate: position,
  } satisfies Partial<ViewProps>;
}

function randomId() {
  return Math.random().toString(36).substring(2, 15);
}
