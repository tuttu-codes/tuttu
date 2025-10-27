import { getConvexAuthToken, waitForConvexSessionId } from '~/lib/stores/sessionId';
import { json } from '@vercel/remix';
import type { LoaderFunctionArgs } from '@vercel/remix';
import { useMutation, useConvex, useQuery } from 'convex/react';
import { api } from '@convex/_generated/api';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { Toaster } from '~/components/ui/Toaster';
import { setSelectedTeamSlug, useSelectedTeamSlug, waitForSelectedTeamSlug } from '~/lib/stores/convexTeams';
import { TeamSelector } from '~/components/convex/TeamSelector';
import { useTeamsInitializer } from '~/lib/stores/startup/useTeamsInitializer';
import { TuttuAuthProvider, useTuttuAuth } from '~/components/chat/TuttuAuthWrapper';
import { useParams } from '@remix-run/react';
import { Loading } from '~/components/Loading';
import type { MetaFunction } from '@vercel/remix';
import { Button } from '@ui/Button';
import { ConvexError } from 'convex/values';
import { Sheet } from '@ui/Sheet';
import { useAuth } from '@workos-inc/authkit-react';
export const meta: MetaFunction = () => {
  return [
    { title: 'Built with Tuttu' },
    {
      name: 'description',
      content: 'Someone shared with you a project built with Tuttu, the no-code full-stack web app developer',
    },
    {
      property: 'og:image',
      content: 'https://tuttu.convex.dev/social_preview_share.png',
    },
  ];
};

export const loader = async (args: LoaderFunctionArgs) => {
  const url = new URL(args.request.url);
  let code: string | null = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (state) {
    code = null;
  }
  return json({ code });
};

export default function ShareProject() {
  return (
    <>
      <TuttuAuthProvider redirectIfUnauthenticated={false}>
        <ShareProjectContent />
      </TuttuAuthProvider>
      <Toaster />
    </>
  );
}

function ShareProjectContent() {
  const { signIn } = useAuth();
  const { shareCode } = useParams();

  if (!shareCode) {
    throw new Error('shareCode is required');
  }

  useTeamsInitializer();
  const tuttuAuthState = useTuttuAuth();

  const cloneChat = useMutation(api.share.clone);
  const convex = useConvex();
  const getShareDescription = useQuery(api.share.getShareDescription, { code: shareCode });

  const handleCloneChat = useCallback(async () => {
    const sessionId = await waitForConvexSessionId('useInitializeChat');
    const teamSlug = await waitForSelectedTeamSlug('useInitializeChat');
    const workosAccessToken = getConvexAuthToken(convex);
    if (!workosAccessToken) {
      console.error('No WorkOS access token');
      toast.error('Unexpected error cloning chat');
      return;
    }
    const projectInitParams = {
      teamSlug,
      workosAccessToken,
    };
    try {
      const { id: chatId } = await cloneChat({ shareCode, sessionId, projectInitParams });
      window.location.href = `/chat/${chatId}`;
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error(`Error cloning chat: ${e.data.message}`);
      } else {
        toast.error('Unexpected error cloning chat');
      }
    }
  }, [convex, cloneChat, shareCode]);

  const selectedTeamSlug = useSelectedTeamSlug();

  if (tuttuAuthState.kind === 'loading') {
    return <Loading />;
  }

  if (tuttuAuthState.kind !== 'fullyLoggedIn') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 rounded-xl border bg-white p-8">
          <div className="space-y-2 text-center">
            <h1 className="text-center text-3xl font-bold">Sign in to Tuttu</h1>
            <p className="text-base text-gray-500">
              Please sign in to Tuttu to clone this project
              {getShareDescription?.description ? (
                <>
                  : <span className="font-bold">{getShareDescription.description}</span>
                </>
              ) : (
                ''
              )}
            </p>
          </div>

          <Button
            onClick={() => {
              signIn();
            }}
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Sheet className="w-full max-w-md space-y-6 border p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-center font-semibold">Clone Project</h1>
          {getShareDescription?.description && <p className="text-base">{getShareDescription.description}</p>}
        </div>

        <div className="flex flex-col items-center space-y-4">
          <div className="space-y-2">
            <h2 className="text-center">Select Team</h2>
            <p className="text-center text-sm text-content-secondary">Choose where to clone this project</p>
          </div>

          {tuttuAuthState.kind === 'fullyLoggedIn' && (
            <TeamSelector selectedTeamSlug={selectedTeamSlug} setSelectedTeamSlug={setSelectedTeamSlug} />
          )}
        </div>

        <Button
          className="flex w-full items-center justify-center gap-2 px-6 py-3"
          onClick={handleCloneChat}
          disabled={!selectedTeamSlug}
        >
          Clone Project
        </Button>
      </Sheet>
    </div>
  );
}
