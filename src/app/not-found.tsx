import { redirect } from "next/navigation";
/** Nothing in the demo should 404 — send strays home. */
export default function NotFound() { redirect("/"); }
