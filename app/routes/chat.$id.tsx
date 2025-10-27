import type { LoaderFunctionArgs, MetaFunction } from '@vercel/remix';
import { json } from '@vercel/remix';
import { ClientOnly } from 'remix-utils/client-only';
import { Header } from '~/components/header/Header';
import { ExistingChat } from '~/components/ExistingChat.client';
import { redirect, useLoaderData } from '@remix-run/react';

export const meta: MetaFunction = () => {
  return [{ title: 'Tuttu' }];
};

export async function loader(args: LoaderFunctionArgs) {
  const url = new URL(args.request.url);
  const code = url.searchParams.get('code');
  return json({ id: args.params.id, code });
}

// This route is *only* used when reloading an existing chat. The flow
// of going to the homepage and typing in a prompt goes through
// `_index.tsx` and then does a client navigation without rendering
// `ChatRoute` directly.
//
// So, this route is less latency critical the the homepage, and we're
// more comfortable showing spinners to rehydrate the app state.
export default function ChatRoute() {
  const loaderData = useLoaderData<{ id: string }>();
  if (!loaderData.id) {
    redirect('/');
  }
  return (
    <div className="flex size-full flex-col bg-bolt-elements-background-depth-1">
      <Header />
      <ClientOnly>{() => <ExistingChat chatId={loaderData.id} />}</ClientOnly>
    </div>
  );
}
