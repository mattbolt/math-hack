import { SignIn, SignUp, useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Footer } from "@/components/ui/footer";
import { useLocation } from "wouter";

export default function Auth() {
  const { isSignedIn } = useAuth();
  const [, setLocation] = useLocation();

  if (isSignedIn) {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Math Challenge Arena
            </CardTitle>
            <p className="text-muted-foreground">Join the ultimate math competition</p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="mt-6">
                <SignIn 
                  routing="hash"
                  fallbackRedirectUrl="/"
                  appearance={{
                    elements: {
                      formButtonPrimary: 
                        "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
                      card: "shadow-none",
                      headerTitle: "hidden",
                      headerSubtitle: "hidden",
                    }
                  }}
                />
              </TabsContent>
              <TabsContent value="signup" className="mt-6">
                <SignUp 
                  routing="hash"
                  fallbackRedirectUrl="/"
                  appearance={{
                    elements: {
                      formButtonPrimary: 
                        "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
                      card: "shadow-none",
                      headerTitle: "hidden",
                      headerSubtitle: "hidden",
                    }
                  }}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  );
}