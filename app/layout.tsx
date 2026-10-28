import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Argentine à 9 · Les Djeunes",description:"Explorer l’Argentine et préparer notre voyage à neuf.",robots:{index:false,follow:false}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body>{children}</body></html>;}
