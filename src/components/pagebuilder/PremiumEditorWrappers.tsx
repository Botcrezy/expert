import { PageBlock } from "./BlockTypes";
import {
  FAQProEditor,
  PricingCompareEditor,
  ServiceCategoriesEditor,
  TestimonialsCarouselEditor,
  TrustBarEditor,
} from "./editors/PremiumEditors";

export function TrustBarEditorWrapper({
  block,
  onChange,
}: {
  block: PageBlock & { type: "trustbar" };
  onChange: (b: PageBlock) => void;
}) {
  return <TrustBarEditor block={block} onChange={onChange} />;
}

export function ServiceCategoriesEditorWrapper({
  block,
  onChange,
}: {
  block: PageBlock & { type: "service_categories" };
  onChange: (b: PageBlock) => void;
}) {
  return <ServiceCategoriesEditor block={block} onChange={onChange} />;
}

export function TestimonialsCarouselEditorWrapper({
  block,
  onChange,
}: {
  block: PageBlock & { type: "testimonials_carousel" };
  onChange: (b: PageBlock) => void;
}) {
  return <TestimonialsCarouselEditor block={block} onChange={onChange} />;
}

export function PricingCompareEditorWrapper({
  block,
  onChange,
}: {
  block: PageBlock & { type: "pricing_compare" };
  onChange: (b: PageBlock) => void;
}) {
  return <PricingCompareEditor block={block} onChange={onChange} />;
}

export function FAQProEditorWrapper({
  block,
  onChange,
}: {
  block: PageBlock & { type: "faq_pro" };
  onChange: (b: PageBlock) => void;
}) {
  return <FAQProEditor block={block} onChange={onChange} />;
}
