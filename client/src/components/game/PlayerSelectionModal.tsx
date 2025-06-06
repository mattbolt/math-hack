import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Player } from "@shared/schema";
import { ArrowRight, Coins, User, Shield, Snowflake, Zap, Shuffle, Skull } from "lucide-react";

interface PlayerSelectionModalProps {
  isOpen: boolean;
  players: Player[];
  onSelect: (playerId: string) => void;
  onCancel: () => void;
  title: string;
  activeEffects?: {[playerId: string]: {[effect: string]: number}};
}

export function PlayerSelectionModal({ 
  isOpen, 
  players, 
  onSelect, 
  onCancel, 
  title,
  activeEffects = {}
}: PlayerSelectionModalProps) {
  const getPlayerColor = (index: number) => {
    const colors = [
      "bg-blue-500",
      "bg-emerald-500", 
      "bg-orange-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-cyan-500"
    ];
    return colors[index % colors.length];
  };

  const getPowerUpIcon = (effect: string) => {
    switch (effect) {
      case 'shield':
        return <Shield className="w-4 h-4 text-emerald-400" />;
      case 'slow':
        return <Zap className="w-4 h-4 text-orange-400" />;
      case 'freeze':
        return <Snowflake className="w-4 h-4 text-cyan-400" />;
      case 'scramble':
        return <Shuffle className="w-4 h-4 text-purple-400" />;
      default:
        return null;
    }
  };

  const isPlayerShielded = (playerId: string) => {
    return activeEffects[playerId] && activeEffects[playerId]['shield'];
  };

  const isPlayerInHack = (player: Player) => {
    // Check if this player is being hacked
    if (player.isBeingHacked) return true;
    
    // Check if this player is hacking someone else (look for any player being hacked by this player)
    const isHackingOthers = players.some(p => p.hackedBy === player.playerId);
    return isHackingOthers;
  };

  const getHackStatus = (player: Player) => {
    if (player.isBeingHacked) return 'being_hacked';
    
    // Check if this player is hacking someone else
    const isHackingOthers = players.some(p => p.hackedBy === player.playerId);
    if (isHackingOthers) return 'hacking';
    
    return null;
  };

  const shouldDisableForHack = (player: Player) => {
    // Only disable if trying to hack and player is already involved in hacking
    return title.toLowerCase().includes('hack') && isPlayerInHack(player);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {[...players].sort((a, b) => b.credits - a.credits).map((player, index) => {
            const shielded = isPlayerShielded(player.playerId);
            const inHack = isPlayerInHack(player);
            const hackStatus = getHackStatus(player);
            const hackDisabled = shouldDisableForHack(player);
            const disabled = shielded || hackDisabled;
            
            return (
              <Button
                key={player.id}
                onClick={() => !disabled && onSelect(player.playerId)}
                variant="outline"
                disabled={!!disabled}
                className={`w-full flex items-center justify-between px-4 py-3 transition-all duration-200 ${
                  shielded 
                    ? 'bg-emerald-900/30 border-emerald-600/50 cursor-not-allowed opacity-60' 
                    : hackDisabled
                    ? 'bg-purple-900/30 border-purple-600/50 cursor-not-allowed opacity-60'
                    : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600 hover:border-blue-500'
                }`}
              >
              <div className="flex items-center space-x-3 flex-1">
                <div className={`w-8 h-8 ${getPlayerColor(player.colorIndex)} rounded-full flex items-center justify-center`}>
                  <span className="text-xs font-bold text-white">
                    {player.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium">{player.name}</div>
                  <div className="text-sm text-slate-400 flex items-center space-x-1">
                    <Coins className="w-3 h-3 text-yellow-500" />
                    <span>{player.credits} credits</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-1 ml-auto">
                {/* Power-up effects */}
                {activeEffects[player.playerId] && Object.keys(activeEffects[player.playerId]).length > 0 && 
                  Object.keys(activeEffects[player.playerId]).map((effect) => (
                    <div key={effect} className="flex items-center p-1 bg-slate-600/50 rounded">
                      {getPowerUpIcon(effect)}
                    </div>
                  ))
                }
                {/* Hack status indicator */}
                {hackStatus && (
                  <div className="flex items-center p-1 bg-purple-600/50 rounded">
                    <Skull className="w-4 h-4 text-purple-400" />
                  </div>
                )}
              </div>
            </Button>
            )
          })}
        </div>
        
        <Button 
          onClick={onCancel}
          variant="outline"
          className="w-full mt-4 bg-slate-700 hover:bg-slate-600 border-slate-600"
        >
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
