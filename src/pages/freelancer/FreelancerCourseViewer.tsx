import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FreelancerSidebar } from "@/components/layout/FreelancerSidebar";
import CourseViewer from "@/pages/studio/CourseViewer";

export default function FreelancerCourseViewer() {
  return (
    <CourseViewer
      userType="freelancer"
      sidebarComponent={<FreelancerSidebar />}
      basePath="/freelancer"
    />
  );
}
