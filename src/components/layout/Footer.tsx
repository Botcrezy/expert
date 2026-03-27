import { Link } from "react-router-dom";
import { usePlatformSettings } from "@/hooks/usePlatformSettings";

export function Footer() {
  const { data: settings } = usePlatformSettings();

  return (
    <footer className="bg-gray-900 text-gray-400 py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              {settings?.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt={settings?.siteName || "Sity Experts"} 
                  className="w-10 h-10 rounded-xl object-contain"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold">
                    {settings?.siteName?.charAt(0) || "S"}
                  </span>
                </div>
              )}
              <span className="text-white font-bold text-xl">
                {settings?.siteName || "Sity Experts"}
              </span>
            </div>
            <p className="text-gray-400 max-w-md leading-relaxed">
              {settings?.siteDescription || "منصة خدمات مُدارة احترافية تربطك بأفضل الخبراء لتنفيذ مشاريعك بجودة عالية وفي الوقت المحدد."}
            </p>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">روابط سريعة</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/services" className="hover:text-white transition-colors">الخدمات</Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-white transition-colors">الأسعار</Link>
              </li>
              <li>
                <Link to="/how-it-works" className="hover:text-white transition-colors">كيف نعمل</Link>
              </li>
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">الأسئلة الشائعة</Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-semibold mb-4">تواصل معنا</h4>
            <ul className="space-y-3">
              <li>
                <a 
                  href={`mailto:${settings?.supportEmail || "support@sityexperts.com"}`} 
                  className="hover:text-white transition-colors"
                >
                  {settings?.supportEmail || "support@sityexperts.com"}
                </a>
              </li>
              <li>
                <Link to="/freelancer/login" className="hover:text-white transition-colors">
                  انضم كفريلانسر
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 pt-8 text-center">
          <p>© {new Date().getFullYear()} {settings?.siteName || "Sity Experts"}. جميع الحقوق محفوظة.</p>
        </div>
      </div>
    </footer>
  );
}