/* eslint-disable curly */
import { useEffect, useCallback, useState } from 'react';
import { JsonView } from 'react-json-view-lite';
import 'react-json-view-lite/dist/index.css';
import type { CoreMessage, FilePart, ToolCallPart, TextPart } from 'ai';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { ClipboardIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useDebugPrompt } from '~/lib/hooks/useDebugPrompt';
import { IconButton } from '~/components/ui/IconButton';

/*
 * The heirarchy here is:
 *
 * <DebugAllPromptsForChat initialChatId={}>
 *   <UserPromptGroup>  // A group of LLM calls that were executed without the user typing anything in between
 *     <LlmPromptAndResponseView model="Anthropic's Best">  // A single call to an LLM and the response we received bac
 *       <CoreMessageView role='system'>      // CoreMessage is a Vercel AI SDK type, it's a User or Assistant or System or Tool message.
 *         Do a good job.
 *       </CoreMessageView>
 *       <CoreMessageView role='user'>
 *         Please make an app!
 *       </CoreMessageView>
 *       <CoreMessageView role='assistant'>
 *         Will do! Please write these files and run this tool.
 *       </CoreMessageView>
 *     </LlmPromptAndResponseView>
 *
 *     --- this represents a new call to /api/chat and a new network request to an LLM provider
 *
 *     <LlmPromptAndResponseView model="Something from AWS">
 *       <CoreMessageView role='system'> // We typically repeat back all these messages
 *         Do a good job.
 *       </CoreMessageView>
 *       <CoreMessageView role='system'> // But we can also add new ones
 *         BTW, the user is using Chrome on a Mac.
 *       </CoreMessageView>
 *       <CoreMessageView role='user'>
 *         Please make an app!
 *       </CoreMessageView>
 *       <CoreMessageView role='assistant'>
 *         Will do! Please write these files and run this tool.
 *       </CoreMessageView>
 *       <CoreMessageView role='tool'>
 *         file write done! and also I deployed the app.
 *       </CoreMessageView>
 *     </LlmPromptAndResponseView>
 *
 *     --- this represents a new call to /api/chat and a new network request to an LLM provider
 *
 *     <LlmPromptAndResponseView model="Something from AWS">
 *       <CoreMessageView role='system'> // We typically repeat back all these messages
 *         Do a good job.
 *       </CoreMessageView>
 *       <CoreMessageView role='system'> // But we can also add new ones
 *         BTW, the user is using Chrome on a Mac.
 *       </CoreMessageView>
 *       <CoreMessageView role='user'>
 *         Please make an app!
 *       </CoreMessageView>
 *       <CoreMessageView role='assistant'>
 *         Will do! Please write these files and run this tool.
 *       </CoreMessageView>
 *       <CoreMessageView role='tool'>
 *         file write done! and also I deployed the app.
 *       </CoreMessageView>
 *       <CoreMessageView role='assistant'>
 *         OK all done, I made you an app!
 *       </CoreMessageView>
 *     </LlmPromptAndResponseView>
 *   </UserPromptGroup>
 *
 *   --- once the users types something, we have a new user prompt group
 *
 *   <UserPromptGroup>
 *     ...
 *   </UserPromptGroup>
 * </DebugAllPromptsForChat>
 */

/** Everything we prompt an LLM with plus its response. This corresponds to a single request to /api/chat. */
type LlmPromptAndResponse = NonNullable<ReturnType<typeof useDebugPrompt>['data']>[number];

/** Every LLM interaction made to address a single user message: one initial call and n calls reporting tool call
 * results. This corresponsides to multiple calls to /api/chat, and therefore these requests may have been serviced by
 * different LLM models or model providers. */
type AllPromptsForUserInteraction = {
  promptAndResponses: LlmPromptAndResponse[];
  summary: {
    triggeringUserMessage: string;
    totalCompletionTokens: number;
    cachedCompletionTokens: number;
    totalOutputTokens: number;
    modelId: string[];
    totalTuttuTokens: number;
  };
};

function isTextPart(part: unknown): part is TextPart {
  return typeof part === 'object' && part !== null && 'type' in part && part.type === 'text';
}

function isFilePart(part: unknown): part is FilePart {
  return typeof part === 'object' && part !== null && 'type' in part && part.type === 'file';
}

function isToolCallPart(part: unknown): part is ToolCallPart {
  return typeof part === 'object' && part !== null && 'type' in part && part.type === 'tool-call';
}

function getMessageCharCount(message: CoreMessage): number {
  if (typeof message.content === 'string') return message.content.length;
  if (Array.isArray(message.content)) {
    return message.content.reduce((sum, part) => {
      if (isTextPart(part)) return sum + part.text.length;
      if (isFilePart(part) && typeof part.data === 'string') return sum + part.data.length;
      if (isToolCallPart(part)) {
        return sum + part.toolName.length + part.toolCallId.length + JSON.stringify(part.args).length;
      }
      if (part.type === 'tool-result') {
        return sum + part.toolName.length + part.toolCallId.length + JSON.stringify(part.result).length;
      }
      return sum;
    }, 0);
  }
  return 0;
}

function estimateTokenCount(charCount: number, totalChars: number, totalTokens: number): number {
  if (totalChars === 0) return 0;
  return Math.round((charCount / totalChars) * totalTokens);
}

function shorten(text: string) {
  // Get first line and add ellipsis if there are more lines
  const lines = text.split('\n').filter((line) => line.trim().length);
  if (lines.length > 1) {
    return lines[0];
  }
  return text.slice(0, 300);
}

// Add this CSS class name generator
function getPreviewClass(text: string) {
  // Create a unique class name based on the content
  return `preview-${Math.abs(text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0))}`;
}

function findLastAssistantMessage(prompt: CoreMessage[]): string {
  // The last assistant message in a LLM  of messages is the response.
  // It should generally just be the last message, full stop.
  for (let i = prompt.length - 1; i >= 0; i--) {
    const message = prompt[i];
    if (message.role === 'assistant') {
      const preview = getMessagePreview(message.content);
      // Get first line and add ellipsis if there are more lines
      const lines = preview.split('\n').filter((line) => line.trim().length);
      if (lines.length > 1) {
        return lines[0] + '...';
      }
      return preview;
    }
  }
  return 'No assistant message';
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

function formatTuttuTokenPrice(tuttuTokens: number): string {
  const rawPrice = (tuttuTokens / 1_000_000) * 0.1;
  return rawPrice < 0.01 ? rawPrice.toFixed(3) : Number(rawPrice.toFixed(2)).toString();
}

// Everything we sent to an LLM, plus the response we recieved (an Assistant message);
function LlmPromptAndResponseView({ promptAndResponse }: { promptAndResponse: LlmPromptAndResponse }) {
  const { prompt, completion, finishReason, modelId } = promptAndResponse;

  const [isExpanded, setIsExpanded] = useState(true);
  const promptTokensTotal = promptAndResponse.usage.promptTokens;
  const cachedPromptTokens = promptAndResponse.usage.cachedPromptTokens;
  const outputTokens = promptAndResponse.usage.completionTokens;
  const tuttuTokens = promptAndResponse.tuttuTokens || 0;

  // Calculate total characters
  const totalInputChars = (prompt || []).reduce((sum, msg) => sum + getMessageCharCount(msg), 0);
  const totalOutputChars = (completion || []).reduce((sum, msg) => sum + getMessageCharCount(msg), 0);

  const getTokenEstimate = (message: CoreMessage) => {
    const charCount = getMessageCharCount(message);
    return estimateTokenCount(charCount, totalInputChars, promptTokensTotal);
  };

  const lastAssistantMessage = findLastAssistantMessage(completion);

  return (
    <div className="rounded border p-4 dark:border-gray-700">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={isExpanded}
      >
        <div className="text-gray-500">
          {isExpanded ? <ChevronDownIcon className="size-5" /> : <ChevronRightIcon className="size-5" />}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <div className="font-medium text-gray-900 dark:text-gray-100">{lastAssistantMessage}</div>
          <div className="flex justify-between gap-1 text-xs text-gray-500 dark:text-gray-400">
            <div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatNumber(promptTokensTotal - cachedPromptTokens)}
              </span>{' '}
              uncached prompt tokens
              {cachedPromptTokens ? ` (+${formatNumber(cachedPromptTokens)} cached)` : ''} (
              {formatNumber(totalInputChars)} chars total)
            </div>
            <div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatNumber(outputTokens)}</span>{' '}
              completion tokens ({formatNumber(totalOutputChars)} chars)
            </div>
            {tuttuTokens > 0 && (
              <div>
                <span className="font-semibold text-gray-900 dark:text-gray-100">{formatNumber(tuttuTokens)}</span> tuttu
                tokens (${formatTuttuTokenPrice(tuttuTokens)})
              </div>
            )}
            <div>finish: {finishReason}</div>
            <div>model: {modelId}</div>
          </div>
        </div>
      </button>
      {isExpanded && prompt && (
        <div className="mt-4">
          <div className="mt-4 space-y-0 rounded border border-gray-200 p-2 dark:border-gray-700">
            <div>
              {formatNumber(cachedPromptTokens)} cached prompt tokens +{' '}
              {formatNumber(promptTokensTotal - cachedPromptTokens)} uncached prompt tokens (
              {formatNumber(totalInputChars)} chars total)
            </div>

            {prompt.map((message, idx) => (
              <CoreMessageView
                key={idx}
                message={message}
                getTokenEstimate={getTokenEstimate}
                totalCompletionTokens={promptTokensTotal}
              />
            ))}
          </div>
          <div className="mt-4 space-y-0 rounded border border-gray-200 p-2 dark:border-gray-700">
            <div>
              {formatNumber(outputTokens)} completion tokens ({formatNumber(totalOutputChars)} chars)
            </div>
            {completion.map((message, idx) => (
              <CoreMessageView key={idx} message={message} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

type CoreMessageViewProps = {
  message: CoreMessage;
  getTokenEstimate?: (message: CoreMessage) => number;
  totalCompletionTokens?: number;
};

function getMessagePreview(content: CoreMessage['content']): string {
  if (typeof content === 'string') {
    return content;
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (isTextPart(part)) {
          return part.text;
        }
        if (isFilePart(part) && typeof part.data === 'string') {
          return part.data;
        }
        return '';
      })
      .join(' ');
  }
  return '';
}

type MessageContentViewProps = {
  content: CoreMessage['content'];
  showRawJson?: boolean;
};

function MessageContentView({ content, showRawJson = false }: MessageContentViewProps) {
  const [isJsonVisible, setIsJsonVisible] = useState(false);

  if (typeof content === 'string') {
    return <div className="whitespace-pre-wrap text-sm">{content}</div>;
  }

  if (!Array.isArray(content)) {
    return <JsonView data={content} />;
  }

  return (
    <div className="space-y-2">
      <div className="cursor-default space-y-2">
        {content.map((part, idx) => {
          if (isTextPart(part)) {
            return (
              <div key={idx} className="rounded bg-white/50 p-2 dark:bg-black/5">
                <div className="text-xs font-medium text-gray-500">text</div>
                <div className="whitespace-pre-wrap text-sm">{part.text}</div>
              </div>
            );
          }

          if (isFilePart(part)) {
            const fileData = typeof part.data === 'string' ? part.data : '[Binary Data]';
            return (
              <div key={idx} className="rounded bg-purple-50 p-2 dark:bg-purple-900/10">
                <div className="text-xs font-medium text-purple-500">file: {part.filename || part.mimeType}</div>
                <div className="whitespace-pre-wrap font-mono text-sm">{fileData}</div>
              </div>
            );
          }

          if (isToolCallPart(part)) {
            return (
              <div key={idx} className="rounded bg-yellow-50 p-2 dark:bg-yellow-900/10">
                <div className="text-xs font-medium text-yellow-600">tool call: {part.toolName}</div>
                <div className="mt-1">
                  <JsonView data={part} />
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="rounded bg-gray-50 p-2 dark:bg-gray-900/10">
              <div className="text-xs font-medium text-gray-500">{part.type}</div>
              {typeof part === 'object' && part !== null && <JsonView data={part as object} />}
            </div>
          );
        })}
      </div>
      {showRawJson && (
        <>
          <button
            onClick={() => setIsJsonVisible(!isJsonVisible)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isJsonVisible ? 'Hide' : 'Show'} raw JSON
          </button>
          {isJsonVisible && (
            <div className="rounded border border-gray-200 p-2 dark:border-gray-700">
              <JsonView data={content} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

const roleColors = {
  system: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
  user: 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800',
  assistant: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
  tool: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
} as const;

function CoreMessageView({ message, getTokenEstimate, totalCompletionTokens }: CoreMessageViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const roleColor = roleColors[message.role as keyof typeof roleColors] || roleColors.user;
  const preview = getMessagePreview(message.content);
  const tokenEstimate = getTokenEstimate?.(message) || null;
  const charCount = getMessageCharCount(message);
  const percentage =
    tokenEstimate === null || totalCompletionTokens === null
      ? null
      : totalCompletionTokens
        ? Math.round((tokenEstimate / totalCompletionTokens) * 100)
        : 0;

  return (
    <div className={`rounded border px-4 py-1 ${roleColor}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 text-left"
        aria-expanded={isExpanded}
      >
        <div className="text-gray-500">
          {isExpanded ? <ChevronDownIcon className="size-5" /> : <ChevronRightIcon className="size-5" />}
        </div>
        <div className="font-medium capitalize">{message.role}</div>
        {percentage !== null && tokenEstimate !== null && (
          <div className="text-xs text-gray-500" title="token estimate is approximate">
            {formatNumber(charCount)} chars (~{formatNumber(tokenEstimate)} tokens, ~{percentage}%)
          </div>
        )}
        <style>{`
          .${getPreviewClass(preview)}::before {
            content: "${shorten(preview).replace(/"/g, '\\"')}";
          }
        `}</style>
        <div
          className={`flex-1 truncate text-sm text-gray-600 dark:text-gray-300 ${getPreviewClass(preview)} before:block before:truncate`}
        />
      </button>

      <div>
        {isExpanded && (
          <div className="mt-2">
            <div className={'text-sm text-gray-600 dark:text-gray-300'}>
              <div>
                <MessageContentView content={message.content} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function findTriggeringUserMessage(promptAndResponses: LlmPromptAndResponse[]): string {
  // Look through all prompt and responses in reverse order.
  // Generally this should be the final CoreMessage of the prompt.
  for (let i = promptAndResponses.length - 1; i >= 0; i--) {
    const promptAndResponse = promptAndResponses[i];
    // Look through messages in reverse order to find the last user message
    if (promptAndResponse.prompt) {
      for (let j = promptAndResponse.prompt.length - 1; j >= 0; j--) {
        const message = promptAndResponse.prompt[j];
        if (message.role === 'user') {
          return getMessagePreview(message.content);
        }
      }
    }
  }
  return 'No user message found';
}

/** Group into arrays of all LLM interactions necessary to respond to a single user query. */
function groupIntoUserPrompts(data: LlmPromptAndResponse[]): AllPromptsForUserInteraction[] {
  const groups: AllPromptsForUserInteraction[] = [];
  let currentGroup: LlmPromptAndResponse[] = [];

  data.forEach((item, index) => {
    currentGroup.push(item);

    // If this item has a finish reason other than tool-call, or if it's the last item,
    // we end the current group and start a new one.
    if (item.finishReason !== 'tool-calls' || index === data.length - 1) {
      if (currentGroup.length > 0) {
        const totalCompletionTokens = currentGroup.reduce((sum, item) => {
          const usage = item.usage;
          return sum + usage.promptTokens;
        }, 0);
        const cachedCompletionTokens = currentGroup.reduce((sum, item) => {
          const usage = item.usage;
          return sum + usage.cachedPromptTokens;
        }, 0);
        const totalOutputTokens = currentGroup.reduce((sum, item) => {
          const usage = item.usage;
          return sum + usage.completionTokens;
        }, 0);
        const totalTuttuTokens = currentGroup.reduce((sum, item) => {
          return sum + (item.tuttuTokens || 0);
        }, 0);

        // Collect unique model IDs using a Set
        const uniqueModelIds = new Set(currentGroup.map((item) => item.modelId));

        groups.push({
          promptAndResponses: [...currentGroup],
          summary: {
            triggeringUserMessage: findTriggeringUserMessage(currentGroup),
            totalCompletionTokens,
            cachedCompletionTokens,
            totalOutputTokens,
            modelId: Array.from(uniqueModelIds),
            totalTuttuTokens,
          },
        });
        currentGroup = [];
      }
    }
  });

  return groups;
}

function userMessageWithoutBoltArtifact(s: string) {
  const closeTag = '</boltArtifact>';
  const lastIndex = s.lastIndexOf(closeTag);
  return lastIndex === -1 ? s : s.slice(lastIndex + closeTag.length);
}

function UserPrompt({ group }: { group: AllPromptsForUserInteraction }) {
  // Calculate total characters for the group
  const totalPromptChars = group.promptAndResponses.reduce((sum, item) => {
    return sum + (item.prompt?.reduce((msgSum, msg) => msgSum + getMessageCharCount(msg), 0) || 0);
  }, 0);
  const totalCompletionChars = group.promptAndResponses.reduce((sum, item) => {
    return sum + (item.completion?.reduce((msgSum, msg) => msgSum + getMessageCharCount(msg), 0) || 0);
  }, 0);

  return (
    <div className="space-y-2 rounded-lg border-2 border-gray-200 p-4 dark:border-gray-700">
      <div className="mb-4 border-b border-gray-200 pb-2 dark:border-gray-700">
        <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
          {userMessageWithoutBoltArtifact(group.summary.triggeringUserMessage)}
        </div>
        <div className="mt-1 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
          <div>Model(s): {group.summary.modelId.join(', ')}</div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatNumber(group.summary.totalCompletionTokens - group.summary.cachedCompletionTokens)}
            </span>{' '}
            uncached prompt tokens
            {group.summary.cachedCompletionTokens
              ? ` (+${formatNumber(group.summary.cachedCompletionTokens)} cached)`
              : ''}{' '}
            ({formatNumber(totalPromptChars)} chars total)
          </div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatNumber(group.summary.totalOutputTokens)}
            </span>{' '}
            completion tokens ({formatNumber(totalCompletionChars)} chars)
          </div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {formatNumber(group.summary.totalTuttuTokens)}
            </span>{' '}
            tuttu tokens (${formatTuttuTokenPrice(group.summary.totalTuttuTokens)})
          </div>
        </div>
      </div>
      {group.promptAndResponses.map((promptAndResponse, index) => (
        <LlmPromptAndResponseView key={index} promptAndResponse={promptAndResponse} />
      ))}
    </div>
  );
}

type Props = {
  chatInitialId: string;
  onClose: () => void;
  isDebugPage?: boolean;
};

export default function DebugAllPromptsForChat({ chatInitialId, onClose, isDebugPage }: Props) {
  const { data: promptsAndResponses, isPending, error } = useDebugPrompt(chatInitialId);

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [handleEscape]);

  if (isPending) {
    return null;
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="relative max-h-[90vh] w-[90vw] overflow-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
          <div className="text-center text-red-500">{error.toString()}</div>
        </div>
      </div>
    );
  }

  const userPromptGroups = groupIntoUserPrompts(promptsAndResponses);

  // Calculate totals across all groups
  const totals = userPromptGroups.reduce(
    (acc, group) => {
      return {
        promptTokens: acc.promptTokens + group.summary.totalCompletionTokens,
        cachedPromptTokens: acc.cachedPromptTokens + group.summary.cachedCompletionTokens,
        completionTokens: acc.completionTokens + group.summary.totalOutputTokens,
        tuttuTokens: acc.tuttuTokens + group.summary.totalTuttuTokens,
      };
    },
    {
      promptTokens: 0,
      cachedPromptTokens: 0,
      completionTokens: 0,
      tuttuTokens: 0,
    },
  );

  const totalPrice = formatTuttuTokenPrice(totals.tuttuTokens);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative max-h-[90vh] w-[90vw] overflow-auto rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>
        <div className="mb-4">
          <h2 className="text-xl font-semibold">
            {promptsAndResponses[0]?._creationTime ? (
              <>Prompt from {new Date(promptsAndResponses[0]._creationTime).toLocaleString()}</>
            ) : (
              'Debug Prompt View'
            )}
          </h2>
          <div className="mt-1 flex items-center space-x-1">
            <div className="text-sm text-gray-500 dark:text-gray-400">Chat ID: {chatInitialId}</div>
            <IconButton
              icon={<ClipboardIcon className="size-4" />}
              onClick={() => {
                navigator.clipboard.writeText(chatInitialId);
              }}
              title="Copy Chat ID"
              size="sm"
            />
            {isDebugPage ? (
              <div className="flex items-center space-x-1">
                <IconButton
                  icon={<ClipboardIcon className="size-4" />}
                  onClick={() => {
                    const url = `${window.location.origin}/admin/prompt-debug?id=${encodeURIComponent(chatInitialId)}`;
                    navigator.clipboard.writeText(url);
                  }}
                  title="Copy Debug Page Link"
                  size="sm"
                />
                <span className="text-sm text-gray-500 dark:text-gray-400">(copy link)</span>
              </div>
            ) : (
              <IconButton
                icon={<ArrowTopRightOnSquareIcon className="size-4" />}
                onClick={() => {
                  const url = `${window.location.origin}/admin/prompt-debug?id=${encodeURIComponent(chatInitialId)}`;
                  window.open(url, '_blank');
                }}
                title="Open in Debug Page"
                size="sm"
              />
            )}
          </div>
          <div className="mt-2 flex gap-4 text-sm text-gray-500 dark:text-gray-400">
            <div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatNumber(totals.promptTokens - totals.cachedPromptTokens)}
              </span>{' '}
              total prompt tokens
              {totals.cachedPromptTokens ? ` (+${formatNumber(totals.cachedPromptTokens)} cached)` : ''}
            </div>
            <div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">
                {formatNumber(totals.completionTokens)}
              </span>{' '}
              total completion tokens
            </div>
            <div>
              <span className="font-semibold text-gray-900 dark:text-gray-100">{formatNumber(totals.tuttuTokens)}</span>{' '}
              total tuttu tokens (${totalPrice})
            </div>
          </div>
        </div>
        <div className="space-y-4 overflow-auto">
          {userPromptGroups.map((group, index) => (
            <UserPrompt key={index} group={group} />
          ))}
        </div>
      </div>
    </div>
  );
}
