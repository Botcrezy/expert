import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { PageBlock, BLOCK_TYPES, createDefaultBlock } from "@/components/pagebuilder/BlockTypes";
import { BlockRenderer } from "@/components/pagebuilder/BlockRenderer";
import { BlockEditor } from "@/components/pagebuilder/BlockEditor";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SortableBlockItem } from "@/components/pagebuilder/SortableBlockItem";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Save,
  ArrowRight,
  Monitor,
  Smartphone,
  Layout,
  Loader2,
  Eye,
  EyeOff,
  Settings,
  ExternalLink,
  Search,
  Undo2,
  Redo2,
  Trash2,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function PageBuilder() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    state: blocks,
    set: setBlocks,
    undo,
    redo,
    canUndo,
    canRedo,
    reset: resetHistory,
  } = useUndoRedo<PageBlock[]>([]);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showBlockPicker, setShowBlockPicker] = useState(false);
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [devicePreview, setDevicePreview] = useState<"desktop" | "mobile">("desktop");
  const [seoOpen, setSeoOpen] = useState(false);
  const [blockSearch, setBlockSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(true);

  const [pageSettings, setPageSettings] = useState({
    title: "",
    title_ar: "",
    slug: "",
    meta_title: "",
    meta_description: "",
    og_image: "",
    is_published: false,
    is_in_menu: false,
    menu_order: 0,
  });

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch page data
  const { data: page, isLoading } = useQuery({
    queryKey: ["admin-page", pageId],
    queryFn: async () => {
      if (!pageId) return null;
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("id", pageId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!pageId,
  });

  useEffect(() => {
    if (page && initialLoadRef.current) {
      setPageSettings({
        title: page.title || "",
        title_ar: page.title_ar || "",
        slug: page.slug || "",
        meta_title: page.meta_title || "",
        meta_description: page.meta_description || "",
        og_image: page.og_image || "",
        is_published: page.is_published ?? false,
        is_in_menu: page.is_in_menu ?? false,
        menu_order: page.menu_order ?? 0,
      });
      const pageBlocks = page.page_blocks as unknown;
      if (pageBlocks && Array.isArray(pageBlocks)) {
        resetHistory(pageBlocks as PageBlock[]);
      } else {
        resetHistory([]);
      }
      initialLoadRef.current = false;
    }
  }, [page, resetHistory]);

  // Auto-save effect
  useEffect(() => {
    if (initialLoadRef.current) return;

    setHasUnsavedChanges(true);
    
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(() => {
      saveMutation.mutate();
    }, 3000); // Auto-save after 3 seconds of inactivity

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [blocks, pageSettings]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveMutation.mutate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const updateData = {
        title: pageSettings.title,
        title_ar: pageSettings.title_ar,
        slug: pageSettings.slug,
        meta_title: pageSettings.meta_title,
        meta_description: pageSettings.meta_description,
        og_image: pageSettings.og_image,
        is_published: pageSettings.is_published,
        is_in_menu: pageSettings.is_in_menu,
        menu_order: pageSettings.menu_order,
        page_blocks: blocks as any,
        updated_at: new Date().toISOString(),
      };

      if (pageId) {
        const { error } = await supabase
          .from("cms_pages")
          .update(updateData)
          .eq("id", pageId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-pages"] });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    },
    onError: (error: any) => {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!pageId) return;
      const { error } = await supabase.from("cms_pages").delete().eq("id", pageId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-cms-pages"] });
      toast({ title: "تم حذف الصفحة بنجاح ✅" });
      navigate("/admin/cms");
    },
    onError: (error: any) => {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    },
  });

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addBlock = (type: string) => {
    const newBlock = createDefaultBlock(type);
    if (insertIndex !== null) {
      const newBlocks = [...blocks];
      newBlocks.splice(insertIndex, 0, newBlock);
      setBlocks(newBlocks);
    } else {
      setBlocks([...blocks, newBlock]);
    }
    setShowBlockPicker(false);
    setInsertIndex(null);
    setSelectedBlockId(newBlock.id);
  };

  const addBlockPack = (types: string[]) => {
    const packBlocks = types.map((t) => createDefaultBlock(t));

    if (insertIndex !== null) {
      const newBlocks = [...blocks];
      newBlocks.splice(insertIndex, 0, ...packBlocks);
      setBlocks(newBlocks);
      setSelectedBlockId(packBlocks[0]?.id ?? null);
    } else {
      setBlocks([...blocks, ...packBlocks]);
      setSelectedBlockId(packBlocks[0]?.id ?? null);
    }

    setShowBlockPicker(false);
    setInsertIndex(null);
  };

  const updateBlock = useCallback((updatedBlock: PageBlock) => {
    setBlocks(blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b)));
  }, [blocks, setBlocks]);

  const deleteBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId));
    if (selectedBlockId === blockId) setSelectedBlockId(null);
  };

  const duplicateBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId);
    if (block) {
      const index = blocks.findIndex((b) => b.id === blockId);
      const newBlock = { ...JSON.parse(JSON.stringify(block)), id: crypto.randomUUID() };
      const newBlocks = [...blocks];
      newBlocks.splice(index + 1, 0, newBlock);
      setBlocks(newBlocks);
    }
  };

  const moveBlock = (blockId: string, direction: "up" | "down") => {
    const index = blocks.findIndex((b) => b.id === blockId);
    if ((direction === "up" && index === 0) || (direction === "down" && index === blocks.length - 1)) return;
    const newBlocks = [...blocks];
    const [removed] = newBlocks.splice(index, 1);
    newBlocks.splice(direction === "up" ? index - 1 : index + 1, 0, removed);
    setBlocks(newBlocks);
  };

  // Group block types by category
  const categories = Array.from(new Set(BLOCK_TYPES.map(b => b.category)));
  const categoryLabels: Record<string, string> = {
    layout: "التخطيط",
    content: "المحتوى",
    features: "المميزات",
    business: "الأعمال",
    social: "التواصل",
    actions: "الإجراءات",
    info: "المعلومات",
    media: "الوسائط",
    structure: "الهيكل",
  };

  const filteredBlockTypes = BLOCK_TYPES.filter(b => {
    const matchesSearch = b.label.includes(blockSearch) || b.description.includes(blockSearch);
    const matchesCategory = !selectedCategory || b.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="h-14 border-b bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/cms")}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-sm">{pageSettings.title_ar || "صفحة جديدة"}</h1>
            <p className="text-xs text-muted-foreground">/{pageSettings.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 border rounded-lg p-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={undo}
              disabled={!canUndo}
              title="تراجع (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={redo}
              disabled={!canRedo}
              title="إعادة (Ctrl+Shift+Z)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Device Preview */}
          <div className="flex items-center gap-1 border rounded-lg p-0.5">
            <Button
              size="icon"
              variant={devicePreview === "desktop" ? "default" : "ghost"}
              className="h-7 w-7"
              onClick={() => setDevicePreview("desktop")}
            >
              <Monitor className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="icon"
              variant={devicePreview === "mobile" ? "default" : "ghost"}
              className="h-7 w-7"
              onClick={() => setDevicePreview("mobile")}
            >
              <Smartphone className="w-3.5 h-3.5" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setPreviewMode(!previewMode)}>
            {previewMode ? <EyeOff className="w-4 h-4 ml-1" /> : <Eye className="w-4 h-4 ml-1" />}
            {previewMode ? "تعديل" : "معاينة"}
          </Button>

          <Button variant="outline" size="sm" onClick={() => setSeoOpen(true)}>
            <Settings className="w-4 h-4 ml-1" />
            SEO
          </Button>

          {pageSettings.is_published && (
            <Button variant="ghost" size="sm" asChild>
              <a href={`/${pageSettings.slug}`} target="_blank" rel="noopener">
                <ExternalLink className="w-4 h-4 ml-1" />
                عرض
              </a>
            </Button>
          )}

          {/* Save Status */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>جاري الحفظ...</span>
              </>
            ) : hasUnsavedChanges ? (
              <>
                <Clock className="w-3 h-3" />
                <span>تغييرات غير محفوظة</span>
              </>
            ) : lastSaved ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>تم الحفظ</span>
              </>
            ) : null}
          </div>

          <div className="flex items-center gap-2 px-2 py-1 border rounded-lg">
            <Switch
              checked={pageSettings.is_published}
              onCheckedChange={(v) => setPageSettings({ ...pageSettings, is_published: v })}
            />
            <span className="text-xs">{pageSettings.is_published ? "منشور" : "مسودة"}</span>
          </div>

          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Save className="w-4 h-4 ml-1" />}
            حفظ
          </Button>

          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Blocks Sidebar */}
        {!previewMode && (
          <aside className="w-72 border-l bg-card flex flex-col shrink-0">
            <div className="p-3 border-b">
              <h3 className="font-semibold text-sm">البلوكات</h3>
              <p className="text-xs text-muted-foreground">اسحب لإعادة الترتيب</p>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1">
                    {blocks.map((block, index) => (
                      <SortableBlockItem
                        key={block.id}
                        block={block}
                        isSelected={selectedBlockId === block.id}
                        onSelect={() => setSelectedBlockId(block.id)}
                        onEdit={() => setSelectedBlockId(block.id)}
                        onDuplicate={() => duplicateBlock(block.id)}
                        onDelete={() => deleteBlock(block.id)}
                        onMoveUp={() => moveBlock(block.id, "up")}
                        onMoveDown={() => moveBlock(block.id, "down")}
                        isFirst={index === 0}
                        isLast={index === blocks.length - 1}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>

            <div className="p-3 border-t">
              <Button
                variant="default"
                className="w-full"
                onClick={() => {
                  setInsertIndex(blocks.length);
                  setShowBlockPicker(true);
                }}
              >
                <Plus className="w-4 h-4 ml-2" />
                إضافة بلوك
              </Button>
            </div>
          </aside>
        )}

        {/* Preview Area */}
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div
            className={cn(
              "mx-auto transition-all",
              devicePreview === "mobile" ? "max-w-[375px]" : "max-w-full",
              !previewMode && "p-4"
            )}
          >
            <div className={cn("bg-background min-h-full", !previewMode && "rounded-xl shadow-sm overflow-hidden border")}>
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-96 text-muted-foreground">
                  <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Layout className="w-10 h-10 opacity-50" />
                  </div>
                  <p className="font-medium mb-2">لا توجد بلوكات بعد</p>
                  <p className="text-sm text-muted-foreground mb-4">ابدأ بإضافة بلوكات لتصميم صفحتك</p>
                  <Button onClick={() => { setInsertIndex(0); setShowBlockPicker(true); }}>
                    <Plus className="w-4 h-4 ml-2" />
                    أضف أول بلوك
                  </Button>
                </div>
              ) : (
                blocks.map((block) => (
                  <div
                    key={block.id}
                    className={cn(
                      "relative group cursor-pointer transition-all",
                      !previewMode && selectedBlockId === block.id && "ring-2 ring-primary ring-inset"
                    )}
                    onClick={() => !previewMode && setSelectedBlockId(block.id)}
                  >
                    <BlockRenderer block={block} isPreview={previewMode} />
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Block Picker Sheet */}
      <Sheet open={showBlockPicker} onOpenChange={setShowBlockPicker}>
        <SheetContent side="left" className="w-[480px] sm:max-w-[480px] p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>اختر بلوك</SheetTitle>
            <div className="relative mt-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن بلوك..."
                value={blockSearch}
                onChange={(e) => setBlockSearch(e.target.value)}
                className="pr-10"
              />
            </div>
          </SheetHeader>
          
          <div className="flex gap-2 p-4 border-b overflow-x-auto">
            <Button
              size="sm"
              variant={selectedCategory === null ? "default" : "outline"}
              onClick={() => setSelectedCategory(null)}
            >
              الكل
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                size="sm"
                variant={selectedCategory === cat ? "default" : "outline"}
                onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
              >
                {categoryLabels[cat] || cat}
              </Button>
            ))}
          </div>

          <div className="p-4 overflow-y-auto max-h-[calc(100vh-180px)]">
            <div className="space-y-3 mb-5">
              <div className="text-xs font-semibold text-muted-foreground">حِزم جاهزة (Premium)</div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    addBlockPack([
                      "hero",
                      "trustbar",
                      "service_categories",
                      "testimonials_carousel",
                      "cta",
                    ])
                  }
                  className="p-4 rounded-xl border bg-card/60 hover:bg-card transition-colors text-right"
                >
                  <div className="font-semibold text-sm">Landing Pack</div>
                  <div className="text-xs text-muted-foreground mt-1">Hero + Trust + خدمات + آراء + CTA</div>
                </button>

                <button
                  type="button"
                  onClick={() => addBlockPack(["hero", "pricing_compare", "faq_pro", "cta"]) }
                  className="p-4 rounded-xl border bg-card/60 hover:bg-card transition-colors text-right"
                >
                  <div className="font-semibold text-sm">Pricing Pack</div>
                  <div className="text-xs text-muted-foreground mt-1">مقارنة أسعار + FAQ + CTA</div>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {filteredBlockTypes.map((blockType) => {
                const IconComponent = (Icons as any)[blockType.icon] || Icons.Layout;
                return (
                  <button
                    key={blockType.type}
                    onClick={() => addBlock(blockType.type)}
                    className="flex flex-col items-center gap-2 p-4 rounded-xl border hover:border-primary hover:bg-primary/5 transition-all text-center group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <span className="font-medium text-sm">{blockType.label}</span>
                    <span className="text-xs text-muted-foreground">{blockType.description}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Block Editor Sheet */}
      {selectedBlock && !previewMode && (
        <BlockEditor
          block={selectedBlock}
          onChange={updateBlock}
          onClose={() => setSelectedBlockId(null)}
        />
      )}

      {/* SEO Settings Sheet */}
      <Sheet open={seoOpen} onOpenChange={setSeoOpen}>
        <SheetContent side="left" className="w-[400px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>إعدادات SEO</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>عنوان الصفحة (EN)</Label>
              <Input
                value={pageSettings.title}
                onChange={(e) => setPageSettings({ ...pageSettings, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>عنوان الصفحة (AR)</Label>
              <Input
                value={pageSettings.title_ar}
                onChange={(e) => setPageSettings({ ...pageSettings, title_ar: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>الرابط (Slug)</Label>
              <Input
                value={pageSettings.slug}
                onChange={(e) => setPageSettings({ ...pageSettings, slug: e.target.value })}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <Input
                value={pageSettings.meta_title}
                onChange={(e) => setPageSettings({ ...pageSettings, meta_title: e.target.value })}
                placeholder="عنوان يظهر في نتائج البحث"
              />
              <p className="text-xs text-muted-foreground">{pageSettings.meta_title?.length || 0}/60</p>
            </div>
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea
                value={pageSettings.meta_description}
                onChange={(e) => setPageSettings({ ...pageSettings, meta_description: e.target.value })}
                placeholder="وصف يظهر في نتائج البحث"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">{pageSettings.meta_description?.length || 0}/160</p>
            </div>
            <div className="space-y-2">
              <Label>صورة OG</Label>
              <Input
                value={pageSettings.og_image}
                onChange={(e) => setPageSettings({ ...pageSettings, og_image: e.target.value })}
                placeholder="https://..."
                dir="ltr"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>إضافة للقائمة</Label>
              <Switch
                checked={pageSettings.is_in_menu}
                onCheckedChange={(v) => setPageSettings({ ...pageSettings, is_in_menu: v })}
              />
            </div>
            {pageSettings.is_in_menu && (
              <div className="space-y-2">
                <Label>ترتيب القائمة</Label>
                <Input
                  type="number"
                  value={pageSettings.menu_order}
                  onChange={(e) => setPageSettings({ ...pageSettings, menu_order: parseInt(e.target.value) || 0 })}
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذه الصفحة؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف الصفحة "{pageSettings.title_ar}" بشكل نهائي ولا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              حذف الصفحة
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
