import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "川口市立高等学校 3Dキャンパス",
  description:
    "公開資料・GISデータに基づき実寸スケールで再現した、川口市立高等学校キャンパスの3Dウォークスルー（ファンメイド）",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
