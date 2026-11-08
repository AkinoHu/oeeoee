import { redirect } from "next/navigation";

/** /c on its own has nothing to show — markets are picked on the map. */
export default function MarketsIndex() {
  redirect("/#explore");
}
