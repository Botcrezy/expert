import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ClientSidebar } from "@/components/layout/ClientSidebar";
import CourseViewer from "@/pages/studio/CourseViewer";

export default function ClientCourseViewer() {
  return (
    <CourseViewer
      userType="client"
      sidebarComponent={<ClientSidebar />}
      basePath="/client"
    />
  );
}
