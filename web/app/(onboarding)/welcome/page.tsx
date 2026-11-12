import { WelcomeCarousel } from "@/components/onboarding/welcome-carousel";
import { ConnectionStatus } from "@/components/shell/connection-status";

export default function WelcomePage() { return <WelcomeCarousel connectionStatus={<ConnectionStatus />} />; }
