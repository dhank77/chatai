import type { Route } from "./+types/home";
import { Welcome } from "../welcome/welcome";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Home" },
    { name: "description", content: "ChatAi is a chatbot that can help you with your questions" },
  ];
};

export default function Home() {
  return <Welcome />;
}
