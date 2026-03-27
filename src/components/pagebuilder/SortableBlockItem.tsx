import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PageBlock, BLOCK_TYPES } from "./BlockTypes";
import { Button } from "@/components/ui/button";
import { GripVertical, ChevronUp, ChevronDown, Copy, Trash2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";

interface SortableBlockItemProps {
  block: PageBlock;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function SortableBlockItem({
  block,
  isSelected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: SortableBlockItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  const blockType = BLOCK_TYPES.find((t) => t.type === block.type);
  const IconComponent = (Icons as any)[blockType?.icon || "Layout"] || Icons.Layout;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2 p-2.5 rounded-xl cursor-pointer transition-all duration-200",
        isDragging && "shadow-lg bg-background border-2 border-primary",
        isSelected
          ? "bg-primary/10 border border-primary shadow-sm"
          : "hover:bg-muted/80 border border-transparent"
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <IconComponent className="w-4 h-4 text-primary" />
      </div>
      
      <span className="flex-1 text-sm font-medium truncate">{blockType?.label || block.type}</span>
      
      <div className="flex items-center gap-0.5"
        onClick={(e) => e.stopPropagation()}>

        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          title="تعديل"
        >
          <Settings className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
          disabled={isFirst}
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
          disabled={isLast}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        >
          <Copy className="w-3.5 h-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
