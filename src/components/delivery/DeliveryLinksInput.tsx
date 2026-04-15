import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, ExternalLink, AlertTriangle, Github, Youtube, HardDrive, Link2 } from "lucide-react";

export interface DeliveryLink {
  type: "gdrive" | "github" | "youtube" | "other";
  url: string;
  label?: string;
}

interface DeliveryLinksInputProps {
  links: DeliveryLink[];
  onChange: (links: DeliveryLink[]) => void;
  disabled?: boolean;
}

const linkTypeConfig = {
  gdrive: {
    label: "Google Drive",
    icon: HardDrive,
    placeholder: "https://drive.google.com/file/d/.../view",
    hint: "يجب أن يكون الرابط عام (Anyone with the link can view)",
    color: "text-blue-600",
  },
  github: {
    label: "GitHub",
    icon: Github,
    placeholder: "https://github.com/username/repo",
    hint: "يجب أن يكون المستودع عام (Public repository)",
    color: "text-gray-800 dark:text-gray-200",
  },
  youtube: {
    label: "YouTube",
    icon: Youtube,
    placeholder: "https://www.youtube.com/watch?v=...",
    hint: "يمكن أن يكون الفيديو غير مدرج (Unlisted)",
    color: "text-red-600",
  },
  other: {
    label: "رابط آخر",
    icon: Link2,
    placeholder: "https://...",
    hint: "تأكد أن الرابط يمكن الوصول إليه",
    color: "text-primary",
  },
};

export function DeliveryLinksInput({ links, onChange, disabled }: DeliveryLinksInputProps) {
  const [newType, setNewType] = useState<DeliveryLink["type"]>("gdrive");

  const addLink = () => {
    onChange([...links, { type: newType, url: "", label: "" }]);
  };

  const updateLink = (index: number, field: keyof DeliveryLink, value: string) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const removeLink = (index: number) => {
    onChange(links.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
          ⚠️ يجب أن تكون جميع الروابط عامة أو قابلة للوصول من قبل فريق المراجعة. لن يتم قبول روابط خاصة.
        </AlertDescription>
      </Alert>

      {links.map((link, index) => {
        const config = linkTypeConfig[link.type];
        const Icon = config.icon;
        return (
          <div key={index} className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className={`w-5 h-5 ${config.color}`} />
                <span className="text-sm font-medium">{config.label}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => removeLink(index)}
                disabled={disabled}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            <Input
              value={link.url}
              onChange={(e) => updateLink(index, "url", e.target.value)}
              placeholder={config.placeholder}
              dir="ltr"
              className="font-mono text-sm"
              disabled={disabled}
            />
            <Input
              value={link.label || ""}
              onChange={(e) => updateLink(index, "label", e.target.value)}
              placeholder="وصف مختصر (اختياري)"
              disabled={disabled}
            />
            <p className="text-xs text-muted-foreground">{config.hint}</p>
          </div>
        );
      })}

      <div className="flex items-center gap-2">
        <Select value={newType} onValueChange={(v) => setNewType(v as DeliveryLink["type"])}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gdrive">Google Drive</SelectItem>
            <SelectItem value="github">GitHub</SelectItem>
            <SelectItem value="youtube">YouTube</SelectItem>
            <SelectItem value="other">رابط آخر</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={addLink} disabled={disabled} className="gap-2">
          <Plus className="w-4 h-4" />
          إضافة رابط
        </Button>
      </div>
    </div>
  );
}

export function DeliveryLinksDisplay({ links }: { links: DeliveryLink[] }) {
  if (!links || links.length === 0) return null;
  return (
    <div className="space-y-2 mt-2">
      {links.map((link, i) => {
        const config = linkTypeConfig[link.type] || linkTypeConfig.other;
        const Icon = config.icon;
        return (
          <a
            key={i}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-sm"
          >
            <Icon className={`w-4 h-4 ${config.color}`} />
            <span className="flex-1 truncate">{link.label || link.url}</span>
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
          </a>
        );
      })}
    </div>
  );
}
