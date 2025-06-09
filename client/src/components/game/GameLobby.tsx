import {useState, useEffect} from 'react';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {SignInButton, SignUpButton, useUser} from '@clerk/clerk-react';
import {Crown, Users} from 'lucide-react';


interface GameLobbyProps {
  authLoaded: boolean;
  isAuthenticated: boolean;
  onHostGame: (playerName: string, maxPlayers: number, gameDuration: number) => void;
  onJoinGame: (playerName: string, gameCode: string) => void;
}

export function GameLobby({authLoaded, isAuthenticated, onHostGame, onJoinGame}: GameLobbyProps) {
  const {user} = useUser();
  const [step, setStep] = useState<'auth' | 'choose' | 'host' | 'join'>('choose');
  const [hostName, setHostName] = useState('');
  const [joinName, setJoinName] = useState('');
  const [gameCode, setGameCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [gameDuration, setGameDuration] = useState('5');

  // Pre-populate name fields with user's first name when they navigate to forms
  useEffect(() => {
    if (!authLoaded) return;
    if (step === 'host' && isAuthenticated && user?.firstName && !hostName) {
      setHostName(user.firstName);
    }
    if (step === 'join' && isAuthenticated && user?.firstName && !joinName) {
      setJoinName(user.firstName);
    }
  }, [step, authLoaded, isAuthenticated, user?.firstName, hostName, joinName]);

  useEffect(() => {
    if (authLoaded && isAuthenticated && step === 'auth') {
      setStep('host');
    }
  }, [authLoaded, isAuthenticated, step]);

  const handleHostGame = () => {
    if (hostName.trim()) {
      onHostGame(hostName.trim(), parseInt(maxPlayers), parseInt(gameDuration));
    }
  };

  const handleJoinGame = () => {
    if (joinName.trim() && gameCode.trim()) {
      onJoinGame(joinName.trim(), gameCode.trim().toUpperCase());
    }
  };

  if (step === 'choose') {
    return (
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <img src="/cover.svg" aria-description="Math Hack cover image" alt="Math Hack cover image" className="w-full max-w-64 md:max-w-96 mx-auto"/>
          <p className="text-2xl md:text-3xl text-slate-400 max-w-2xl mx-auto">Play against others in real-time math battles</p>
          <p className="text-lg md:text-xl text-slate-300">answer questions &mdash; earn credits &mdash; hack the competition</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          {/* Host Game Button */}
          <Card className="bg-slate-800/50 backdrop-blur border-slate-700 hover:border-blue-500/50 transition-all group cursor-pointer" onClick={() => {
            if (!authLoaded || !isAuthenticated) {
              setStep('auth');
            } else {
              setStep('host');
            }
          }}>
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Crown className="w-8 h-8 text-blue-500"/>
                </div>
                <h3 className="text-xl font-semibold">Host Game</h3>
                <p className="text-slate-400 text-sm">Create a new game session</p>
              </div>
            </CardContent>
          </Card>

          {/* Join Game Button */}
          <Card className="bg-slate-800/50 backdrop-blur border-slate-700 hover:border-emerald-500/50 transition-all group cursor-pointer" onClick={() => setStep('join')}>
            <CardContent className="p-8">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-emerald-500"/>
                </div>
                <h3 className="text-xl font-semibold">Join Game</h3>
                <p className="text-slate-400 text-sm">Enter a game session code</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (step === 'auth') {
    return <div className="text-center space-y-8">
      <div className="space-y-4">
        <h2 className="text-4xl font-bold">Host a Game</h2>
        <p className="text-slate-400">Set up your game session</p>
      </div>
      <Card className="bg-slate-800/50 backdrop-blur border-slate-700 max-w-md mx-auto">
        <CardContent className="p-8">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform">
            <Crown className="w-8 h-8 text-blue-500"/>
          </div>
          <h3 className="text-slate-400 text-2xl font-bold mb-6">Sign in or Create an account</h3>
          <p className="text-slate-400 mb-2">To host a game you must have an account.</p>
          <p className="text-slate-400 mb-8">Don't have an account? <SignUpButton mode="modal">
            <button className="text-blue-500 hover:text-blue-300">Create Account</button>
          </SignUpButton></p>
          <div className="flex gap-3 items-center">
            <Button className="flex-1 bg-slate-700 hover:bg-slate-600 border-slate-600" variant="outline" onClick={() => setStep('choose')}>Back</Button>
            <SignInButton mode="modal"><Button className="flex-1 bg-blue-700 hover:bg-blue-600">Sign In</Button></SignInButton>
          </div>
        </CardContent>
      </Card>
    </div>;
  }

  if (step === 'host') {
    return (
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-4xl font-bold">Host a Game</h2>
          <p className="text-slate-400">Set up your game session</p>
        </div>

        <Card className="bg-slate-800/50 backdrop-blur border-slate-700 max-w-md mx-auto">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-blue-500"/>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Your name"
                  value={hostName}
                  onChange={(e) => setHostName(e.target.value)}
                  className="bg-slate-700 border-slate-600 focus:border-blue-500"
                />
                <Select value={gameDuration} onValueChange={setGameDuration}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 focus:border-blue-500">
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 minute</SelectItem>
                    <SelectItem value="2">2 minutes</SelectItem>
                    <SelectItem value="3">3 minutes</SelectItem>
                    <SelectItem value="4">4 minutes</SelectItem>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep('choose')}
                  variant="outline"
                  className="flex-1 bg-slate-700 hover:bg-slate-600 border-slate-600"
                >
                  Back
                </Button>
                <Button className="flex-1 bg-blue-700 hover:bg-blue-600" disabled={!hostName.trim()} onClick={handleHostGame}>Create Game</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'join') {
    return (
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-4xl font-bold">Join a Game</h2>
          <p className="text-slate-400">Enter your details and game code</p>
        </div>

        <Card className="bg-slate-800/50 backdrop-blur border-slate-700 max-w-md mx-auto">
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-emerald-500"/>
                </div>
              </div>

              <div className="space-y-4">
                <Input
                  type="text"
                  placeholder="Your name"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  className="bg-slate-700 border-slate-600 focus:border-emerald-500"
                />
                <Input
                  type="text"
                  placeholder="Game Code (e.g. ABC123)"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  className="bg-slate-700 border-slate-600 focus:border-emerald-500 font-mono text-center text-lg tracking-wider"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => setStep('choose')}
                  variant="outline"
                  className="flex-1 bg-slate-700 hover:bg-slate-600 border-slate-600"
                >
                  Back
                </Button>
                <Button
                  onClick={handleJoinGame}
                  disabled={!joinName.trim() || !gameCode.trim()}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600"
                >
                  Join Game
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
