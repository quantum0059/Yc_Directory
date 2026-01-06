import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { AUTHOR_BY_GITHUB_ID_QUERY } from "@/sanity/lib/queries";
import { client } from "@/sanity/lib/client";
import { writeClient } from "@/sanity/lib/write-client";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    async signIn({ user, profile }) {
      if (!profile || !("id" in profile)) {
        return false;
      }

      const { name, email, image } = user;
      const { id, login, bio } = profile as { id: string; login: string; bio?: string };
      const existingUser = await client
        .withConfig({ useCdn: false })
        .fetch(AUTHOR_BY_GITHUB_ID_QUERY, {
          id,
        });

      if (!existingUser) {
        await writeClient.create({
          _type: "author",
          id,
          name,
          username: login,
          email,
          image,
          bio: bio || "",
        });
      }

      return true;
    },
    async jwt({ token, account, profile }) {
      // On sign in, store GitHub ID and fetch Sanity user ID
      if (account && profile && "id" in profile) {
        const githubId = profile.id as string;
        token.githubId = githubId;
        
        const user = await client
          .withConfig({ useCdn: false })
          .fetch(AUTHOR_BY_GITHUB_ID_QUERY, {
            id: githubId,
          });

        if (user?._id) {
          token.id = user._id;
        }
      }
      
      // If token.id is not set but we have a GitHub ID, try to fetch it
      // This handles cases where the token was created but user lookup failed
      if (!token.id && token.githubId) {
        const user = await client
          .withConfig({ useCdn: false })
          .fetch(AUTHOR_BY_GITHUB_ID_QUERY, {
            id: token.githubId,
          });
        
        if (user?._id) {
          token.id = user._id;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.id) {
        Object.assign(session, { id: token.id });
      }
      return session;
    },
  },
});
