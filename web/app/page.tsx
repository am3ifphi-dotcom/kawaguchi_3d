import CampusViewer from "@/components/CampusViewer";
import Link from "next/link";

export default function Home() {
  return (
    <main className="viewer-root">
      <CampusViewer />
      <div className="hud">
        <b>川口市立高等学校 3Dキャンパス（製作中・ファンメイド）</b>
        <br />
        クリックで一人称視点 / WASDで移動 / ESCで解除
        <br />
        実寸再現モデル（公開資料・GISに基づく）／非公式
        <br />
        <Link href="/credits">出典・クレジットはこちら</Link>
      </div>
    </main>
  );
}
