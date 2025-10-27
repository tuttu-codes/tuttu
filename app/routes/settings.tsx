import { useTeamsInitializer } from '~/lib/stores/startup/useTeamsInitializer';
import { TuttuAuthProvider } from '~/components/chat/TuttuAuthWrapper';
import { json } from '@vercel/remix';
import type { LoaderFunctionArgs, MetaFunction } from '@vercel/remix';
import { SettingsContent } from '~/components/SettingsContent.client';
import { ClientOnly } from 'remix-utils/client-only';

export const meta: MetaFunction = () => {
  return [{ title: 'Settings | Tuttu' }];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const url = new URL(args.request.url);
  let code: string | null = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  // If state is also set, this is probably the GitHub OAuth login flow finishing.
  // The code is probably not for us.
  if (state) {
    code = null;
  }
  return json({ code });
};

export default function Settings() {
  useTeamsInitializer();

  return (
    <TuttuAuthProvider redirectIfUnauthenticated={true}>
      <ClientOnly>{() => <SettingsContent />}</ClientOnly>
    </TuttuAuthProvider>
  );
}
