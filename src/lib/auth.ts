import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { employees } from "./schema";
import { eq } from "drizzle-orm";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db
          .select()
          .from(employees)
          .where(eq(employees.email, credentials.email as string))
          .get();
        if (!user) return null;
        // In production, use bcrypt.compare
        // For seed data compatibility, plain text comparison when hash is short
        const bcrypt = await import("bcryptjs");
        let valid = false;
        const ph = user.passwordHash;
        if (ph.length <= 60 && !ph.startsWith("$2")) {
          valid = ph === credentials.password;
        } else {
          valid = await bcrypt.compare(credentials.password as string, ph);
        }
        if (!valid) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          designation: user.designation,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.designation = (user as any).designation;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).designation = token.designation;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  trustHost: true,
});