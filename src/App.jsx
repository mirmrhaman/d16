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
import RequireAuth from "./components/RequireAuth";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout><Home /></Layout>} />
      <Route path="/Services" element={<Layout><Services /></Layout>} />
      <Route path="/Portfolio" element={<Layout><Portfolio /></Layout>} />
      <Route path="/Gallery" element={<Layout><Gallery /></Layout>} />
      <Route path="/About" element={<Layout><About /></Layout>} />
      <Route path="/Blog" element={<Layout><Blog /></Layout>} />
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
