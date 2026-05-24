import { SignInForm } from './signin-form';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Clip Stamper</h1>
          <p className="text-muted-foreground mt-2">
            Voice-activated clip marking for streamers
          </p>
        </div>
        <SignInForm />
      </div>
    </div>
  );
}