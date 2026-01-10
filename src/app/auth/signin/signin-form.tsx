'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCredentialsSignIn(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });
      
      if (result?.error) {
        setError('Invalid credentials. Try demo@clipstamper.dev / demo1234');
      } else {
        window.location.href = '/dashboard';
      }
    } catch {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleOAuthSignIn(provider: 'github' | 'google') {
    setIsLoading(true);
    await signIn(provider, { callbackUrl: '/dashboard' });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign In</CardTitle>
        <CardDescription>
          Choose your preferred sign-in method
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* OAuth Providers */}
        <div className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            onClick={() => handleOAuthSignIn('github')}
            disabled={isLoading}
          >
            GitHub
          </Button>
          <Button
            variant="outline"
            onClick={() => handleOAuthSignIn('google')}
            disabled={isLoading}
          >
            Google
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>

        {/* Credentials Form */}
        <form onSubmit={handleCredentialsSignIn} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="demo@clipstamper.dev"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="demo1234"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}
          
          <Button type="submit" className="w-full" loading={isLoading}>
            Sign In
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Demo: demo@clipstamper.dev / demo1234
        </p>
      </CardContent>
    </Card>
  );
}
