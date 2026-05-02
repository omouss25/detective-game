import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bureau des Affaires Non Résolues",
  description: "Jeu de détective narratif. Enquêtez. Interrogez. Accusez.",
  openGraph: {
    title: "Bureau des Affaires Non Résolues",
    description: "Un jeu de détective narratif dans l'obscurité des années 40-50.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
