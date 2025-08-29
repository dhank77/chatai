import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "ChatAi" },
    { name: "description", content: "ChatAi is a chatbot that can help you with your questions" },
  ];
}

export default function Home() {
  return <Welcome />;
}
