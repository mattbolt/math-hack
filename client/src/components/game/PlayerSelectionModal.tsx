import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Player } from "@shared/schema";
import { ArrowRight, Coins, User, Shield, Snowflake, Zap, Shuffle } from "lucide-react";

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
      "from-emerald-500 to-emerald-600",
      "from-orange-500 to-orange-600",
      "from-purple-500 to-purple-600",
      "from-pink-500 to-pink-600",
      "from-yellow-500 to-yellow-600",
      "from-red-500 to-red-600",
      "from-cyan-500 to-cyan-600"
    ];
    return colors[index % colors.length];
  };

  const getPowerUpIcon = (effect: string) => {
    switch (effect) {
      case 'shield':
        return <Shield className="w-4 h-4 text-blue-400" />;
      case 'slow':
        return <Snowflake className="w-4 h-4 text-blue-300" />;
      case 'freeze':
        return <Zap className="w-4 h-4 text-yellow-400" />;
      case 'scramble':
        return <Shuffle className="w-4 h-4 text-purple-400" />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {players.map((player, index) => (
            <Button
              key={player.id}
              onClick={() => onSelect(player.playerId)}
              variant="outline"
              className="w-full flex items-center justify-between p-4 bg-slate-700/50 hover:bg-slate-700 border-slate-600 hover:border-blue-500"
            >
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${getPlayerColor(index)} rounded-full flex items-center justify-center`}>
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="font-medium">{player.name}</div>
                  <div className="text-sm text-slate-400 flex items-center space-x-1">
                    <Coins className="w-3 h-3 text-yellow-500" />
                    <span>{player.credits} credits</span>
                  </div>
                  {activeEffects[player.playerId] && Object.keys(activeEffects[player.playerId]).length > 0 && (
                    <div className="flex items-center space-x-1 mt-1">
                      <span className="text-xs text-slate-500">Active:</span>
                      {Object.keys(activeEffects[player.playerId]).map((effect) => (
                        <div key={effect} className="flex items-center">
                          {getPowerUpIcon(effect)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Button>
          ))}
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
