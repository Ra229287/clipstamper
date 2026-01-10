import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Clip Stamper</h1>
          <div className="flex gap-4">
            <Link href="/auth/signin">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/signin">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">
            Voice-Activated
            <br />
            <span className="text-primary">Clip Marking</span>
            <br />
            for Streamers
          </h2>
          <p className="mt-6 text-xl text-muted-foreground">
            Mark memorable moments during your stream with voice commands.
            Say &quot;clip it&quot; and never miss a highlight again.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signin">
              <Button size="lg" className="w-full sm:w-auto">
                Start Streaming Free
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                Learn More
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold">Voice Commands</h3>
            <p className="mt-2 text-muted-foreground">
              Say &quot;clip it&quot; during your stream. We mark the timestamp automatically.
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold">Multiple Exports</h3>
            <p className="mt-2 text-muted-foreground">
              Export to YouTube chapters, Obsidian markdown, or plain text.
            </p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-lg font-semibold">Platform Support</h3>
            <p className="mt-2 text-muted-foreground">
              Works with Twitch, YouTube, X, and any streaming platform.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-24">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          Clip Stamper - Voice-activated clip marking for streamers
        </div>
      </footer>
    </div>
  );
}
