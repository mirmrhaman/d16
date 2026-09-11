// import React from "react";
// import Header from "./components/Header";
// import MenuBoard from "./components/Menuboard";
// import Footer from "./components/Footer";

// export default function App() {
//   return (
//     <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
//       <Header />
//       <main className="flex-1">
//         <MenuBoard />
//       </main>
//       <Footer />
//     </div>
//   );
// }

import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./Layout";
import Home from "./Pages/Home";
import Services from "./Pages/Services";
import Portfolio from "./Pages/Portfolio";
import Gallery from "./Pages/Gallery";
import About from "./Pages/About";
import AdminAbout from "./Pages/AdminAbout";
import AdminIcons from "./Pages/AdminIcons";
import Blog from "./Pages/Blog";
import Contact from "./Pages/Contact";
import Login from "./Pages/Login";
import AdminDashboard from "./Pages/AdminDashboard";
import AdminHeroSlides from "./Pages/AdminHeroSlides";
import AdminStats from "./Pages/AdminStats";
import AdminServices from "./Pages/AdminServices";
import AdminProjects from "./Pages/AdminProjects";
import AdminBlog from "./Pages/AdminBlog";
import AdminConsultations from "./Pages/AdminConsultations";
import AdminContactInfo from "./Pages/AdminContactInfo";
import AdminLogo from "./Pages/AdminLogo";
import AdminTheme from "./Pages/AdminTheme";
import AdminAccessControl from "./Pages/AdminAccessControl";
import AdminUsers from "./Pages/AdminUsers";
import AdminGallery from "./Pages/AdminGallery";
import PicYourConcept from "./Pages/PicYourConcept";
import PicYourConceptDetail from "./Pages/PicYourConceptDetail";
import ServiceDetail from "./Pages/ServiceDetail";
import AdminPicYourConcept from "./Pages/AdminPicYourConcept";
import AdminLocations from "./Pages/AdminLocations";
import AdminSocialMedia from "./Pages/AdminSocialMedia";
import RequireAuth from "./components/RequireAuth";
import AdminHistory from './Pages/AdminHistory';
import BlogDetail from './Pages/BlogDetail';

export default function App() {
  return (
    <Routes>
      <Route path="/AdminHistory" element={<RequireAuth allowedRoles={['admin']}><Layout><AdminHistory /></Layout></RequireAuth>} />
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/Services" element={<Layout><Services /></Layout>} />
      <Route path="/Services/:serviceSlug" element={<Layout><ServiceDetail /></Layout>} />
      <Route path="/Portfolio" element={<Layout><Portfolio /></Layout>} />
      <Route path="/PicYourConcept" element={<Layout><PicYourConcept /></Layout>} />
      <Route path="/PicYourConcept/:conceptSlug" element={<Layout><PicYourConceptDetail /></Layout>} />
      <Route path="/Gallery" element={<Layout><Gallery /></Layout>} />
      <Route path="/About" element={<Layout><About /></Layout>} />
      <Route path="/AdminAbout" element={<RequireAuth allowedRoles={['admin', 'super']} featureKey="About"><Layout><AdminAbout /></Layout></RequireAuth>} />
      <Route path="/AdminIcons" element={<RequireAuth allowedRoles={['admin']}><Layout><AdminIcons /></Layout></RequireAuth>} />
      <Route path="/Blog" element={<Layout><Blog /></Layout>} />
      <Route path="/Blog/:postId" element={<Layout><BlogDetail /></Layout>} />
      <Route path="/Contact" element={<Layout><Contact /></Layout>} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/AdminDashboard"
        element={
          <RequireAuth allowedRoles={['admin']}>
            <Layout><AdminDashboard /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/AdminUsers"
        element={
          <RequireAuth allowedRoles={['admin']}>
            <Layout><AdminUsers /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/AdminHeroSlides"
        element={
          <RequireAuth allowedRoles={['admin', 'super']} featureKey="HeroSlides">
            <Layout><AdminHeroSlides /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/AdminStats"
        element={
          <RequireAuth allowedRoles={['admin', 'super']} featureKey="Stats">
            <Layout><AdminStats /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/AdminServices"
        element={
          <RequireAuth allowedRoles={['admin', 'super']} featureKey="Services">
            <Layout><AdminServices /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/AdminProjects"
        element={
          <RequireAuth allowedRoles={['admin', 'super']} featureKey="Projects">
            <Layout><AdminProjects /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/AdminBlog"
        element={
          <RequireAuth allowedRoles={['admin', 'super']} featureKey="Blog">
            <Layout><AdminBlog /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/AdminConsultations"
        element={
          <RequireAuth allowedRoles={['admin']}>
            <Layout><AdminConsultations /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/AdminAccessControl"
        element={
          <RequireAuth allowedRoles={['admin']}>
            <Layout><AdminAccessControl /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/AdminContactInfo"
        element={
          <RequireAuth allowedRoles={['admin']}>
            <Layout><AdminContactInfo /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/AdminLogo"
        element={
          <RequireAuth allowedRoles={['admin']}>
            <Layout><AdminLogo /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/AdminTheme"
        element={
          <RequireAuth allowedRoles={['admin']}>
            <Layout><AdminTheme /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/AdminGallery"
        element={
          <RequireAuth allowedRoles={['admin', 'super']} featureKey="Gallery">
            <Layout><AdminGallery /></Layout>
          </RequireAuth>
        }
      />
      <Route
        path="/AdminPicYourConcept"
        element={
          <RequireAuth allowedRoles={['admin', 'super']} featureKey="PicYourConcept">
            <Layout><AdminPicYourConcept /></Layout>
          </RequireAuth>
        }
      />
      <Route path="/AdminLocations" element={<RequireAuth allowedRoles={['admin']}><Layout><AdminLocations /></Layout></RequireAuth>} />
      <Route path="/AdminSocialMedia" element={<RequireAuth allowedRoles={['admin']}><Layout><AdminSocialMedia /></Layout></RequireAuth>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
