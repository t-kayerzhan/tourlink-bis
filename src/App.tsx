import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Require, NotFound } from './components/Guard';
import Home from './pages/Home';
import Tours from './pages/Tours';
import TourDetail from './pages/TourDetail';
import Checkout from './pages/Checkout';
import ExploreMap from './pages/ExploreMap';
import { Destinations, AgencyPublic, About } from './pages/Public';
import { Login, Signup } from './pages/Auth';
import { MyBookings, Favorites, Compare, Quiz, Notifications, ProfilePage } from './pages/Tourist';
import Apply from './pages/agency/Apply';
import { AgencyShell } from './pages/agency/Shell';
import { Dashboard, Analytics, Customers, CalendarPage } from './pages/agency/Reports';
import AgencyTours from './pages/agency/Tours';
import TourForm from './pages/agency/TourForm';
import AgencyBookings from './pages/agency/Bookings';
import { AdminShell, AdminOverview, AdminAgencies, AdminUsers, AdminTours, AdminDestinations, AdminBookings, AdminReviews, AdminAudit } from './pages/admin/Admin';

export default function App() {
  return (
    <Routes><Route element={<Layout />}>
      <Route index element={<Home />} /><Route path="tours" element={<Tours />} /><Route path="tours/:id" element={<TourDetail />} /><Route path="explore-map" element={<ExploreMap />} />
      <Route path="destinations" element={<Destinations />} /><Route path="agencies/:id" element={<AgencyPublic />} /><Route path="about" element={<About />} /><Route path="login" element={<Login />} /><Route path="signup" element={<Signup />} />
      <Route path="quiz" element={<Quiz />} /><Route path="compare" element={<Compare />} />
      <Route path="profile" element={<Require kind="auth"><ProfilePage /></Require>} /><Route path="my-bookings" element={<Require kind="auth"><MyBookings /></Require>} />
      <Route path="favorites" element={<Require kind="auth"><Favorites /></Require>} /><Route path="notifications" element={<Require kind="auth"><Notifications /></Require>} />
      <Route path="checkout/:id" element={<Require kind="auth"><Checkout /></Require>} />
      <Route path="agency/apply" element={<Require kind="auth"><Apply /></Require>} />
      <Route path="agency" element={<Require kind="agency"><AgencyShell /></Require>}>
        <Route path="dashboard" element={<Dashboard />} /><Route path="tours" element={<AgencyTours />} /><Route path="tours/new" element={<TourForm />} /><Route path="tours/:id/edit" element={<TourForm />} />
        <Route path="calendar" element={<CalendarPage />} /><Route path="bookings" element={<AgencyBookings />} /><Route path="customers" element={<Customers />} /><Route path="analytics" element={<Analytics />} /></Route>
      <Route path="admin" element={<Require kind="admin"><AdminShell /></Require>}>
        <Route index element={<AdminOverview />} /><Route path="agencies" element={<AdminAgencies />} /><Route path="users" element={<AdminUsers />} /><Route path="tours" element={<AdminTours />} /><Route path="tours/:id/edit" element={<TourForm />} />
        <Route path="destinations" element={<AdminDestinations />} /><Route path="bookings" element={<AdminBookings />} /><Route path="reviews" element={<AdminReviews />} /><Route path="audit" element={<AdminAudit />} /></Route>
      <Route path="*" element={<NotFound />} />
    </Route></Routes>
  );
}
