import { useState, useEffect } from "react";
import { Check, X, LayoutGrid, Plus } from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface NewColumnModalProps {
  suggestedName: string;
  onConfirm: (name: string, defaultValue: string) => void;
  onClose: () => void;
}

export default function NewColumnModal({ suggestedName, onConfirm, onClose }: NewColumnModalProps) {
  const [name, setName] = useState(suggestedName);
  const [defaultValue, setDefaultValue] = useState("");

  useEffect(() => {
    setName(suggestedName);
  }, [suggestedName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onConfirm(name.trim(), defaultValue);
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-[400px]" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Add New Column
            </DialogTitle>
            <DialogDescription>
              A new column is being created. You must provide a valid name and a default value to continue.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="col-name" className={name.trim() ? "" : "text-destructive"}>
                Column Name {name.trim() ? "" : "*"}
              </Label>
              <div className="relative">
                <LayoutGrid className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="col-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`pl-9 font-mono ${name.trim() ? "" : "border-destructive/40 focus-visible:ring-destructive"}`}
                  placeholder="e.g. Risk Level"
                  autoFocus
                />
              </div>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="default-val" className={defaultValue.trim() ? "" : "text-destructive"}>
                Default Value {defaultValue.trim() ? "" : "*"}
              </Label>
              <Input
                id="default-val"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                className={`font-mono ${defaultValue.trim() ? "" : "border-destructive/40 focus-visible:ring-destructive"}`}
                placeholder="e.g. Low, 0, N/A"
              />
              <p className="text-[10px] text-muted-foreground">This value will be used for all rows that don't match your conditions.</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" className="w-full" disabled={!name.trim() || !defaultValue.trim()}>
              <Check className="mr-2 h-4 w-4" />
              Initialize Column
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
