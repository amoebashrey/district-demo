import { redirect } from "next/navigation";
/** /plans → Your Plans lives in Profile (EP6). */
export default function PlansIndex() { redirect("/profile"); }
