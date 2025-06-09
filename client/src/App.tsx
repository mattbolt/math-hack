import {Layout} from './Layout.tsx';
import {queryClient} from '@/lib/queryClient';
import {ClerkProvider} from '@clerk/clerk-react';
import {Toaster} from '@/components/ui/toaster';
import {TooltipProvider} from '@/components/ui/tooltip';
import {Game, NotFound, PrivacyPolicy, Terms} from '@/pages';
import {QueryClientProvider} from '@tanstack/react-query';
import {Switch, Route} from 'wouter';

import type {ReactElement} from 'react';


const isDev = import.meta.env.DEV;
const publishableKey = isDev 
  ? import.meta.env.VITE_DEV_CLERK_PUBLISHABLE_KEY 
  : import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) throw new Error('Missing Publishable Key');

const Router = (): ReactElement => {
  return <Switch>
    <Route path="/" component={Game}/>
    <Route path="/privacy-policy" component={PrivacyPolicy}/>
    <Route path="/terms-of-service" component={Terms}/>
    <Route component={NotFound}/>
  </Switch>;
};

export const App = (): ReactElement => {
  return <ClerkProvider publishableKey={publishableKey}>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster/>
        <Layout>
          <Router/>
        </Layout>
      </TooltipProvider>
    </QueryClientProvider>
  </ClerkProvider>;
};