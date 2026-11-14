import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import RequireAuth from '../components/auth/RequireAuth';
import Login from '../pages/Auth/Login';
import ForgotPassword from '../pages/Auth/ForgotPassword';
import ResetPassword from '../pages/Auth/ResetPassword';
import Activate from '../pages/Auth/Activate';
import Account from '../pages/Account/Account';
import Messages from '../pages/Messages/Messages';
import MessageThread from '../pages/Messages/MessageThread';
import Tasks from '../pages/Tasks/Tasks';
import Dashboard from '../pages/Dashboard/Dashboard';
import Patients from '../pages/Patients/Patients';
import PatientProfile from '../pages/Patients/PatientProfile';
import Appointments from '../pages/Appointments/Appointments';
import Consultations from '../pages/Consultations/Consultations';
import ConsultationEditor from '../pages/Consultations/ConsultationEditor';
import SurgicalPlanning from '../pages/SurgicalPlanning/SurgicalPlanning';
import PlanEditor from '../pages/SurgicalPlanning/PlanEditor';
import SurgeryCase from '../pages/Surgery/SurgeryCase';
import Surgery from '../pages/Surgery/Surgery';
import Aftercare from '../pages/Aftercare/Aftercare';
import AftercareCase from '../pages/Aftercare/AftercareCase';
import Billing from '../pages/Billing/Billing';
import QuotationEditor from '../pages/Billing/QuotationEditor';
import InvoiceView from '../pages/Billing/InvoiceView';
import ReceiptView from '../pages/Billing/ReceiptView';
import Pharmacy from '../pages/Pharmacy/Pharmacy';
import PrescriptionView from '../pages/Pharmacy/PrescriptionView';
import MedicationItem from '../pages/Pharmacy/MedicationItem';
import Laboratory from '../pages/Laboratory/Laboratory';
import LabRequest from '../pages/Laboratory/LabRequest';
import Staff from '../pages/Staff/Staff';
import DepartmentReport from '../pages/Staff/DepartmentReport';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="forgot-password" element={<ForgotPassword />} />
      <Route path="reset-password" element={<ResetPassword />} />
      <Route path="activate" element={<Activate />} />
      <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
        <Route path="account" element={<Account />} />
        <Route path="messages" element={<Messages />} />
        <Route path="messages/:id" element={<MessageThread />} />
        <Route path="tasks" element={<Tasks />} />
        <Route index element={<Dashboard />} />
        <Route path="patients" element={<Patients />} />
        <Route path="patients/:id" element={<PatientProfile />} />
        <Route path="appointments" element={<Appointments />} />
        <Route path="consultations" element={<Consultations />} />
        <Route path="consultations/:id" element={<ConsultationEditor />} />
        <Route path="surgical-planning" element={<SurgicalPlanning />} />
        <Route path="surgical-planning/:id" element={<PlanEditor />} />
        <Route path="surgery" element={<Surgery />} />
        <Route path="surgery/:id" element={<SurgeryCase />} />
        <Route path="aftercare" element={<Aftercare />} />
        <Route path="aftercare/:id" element={<AftercareCase />} />
        <Route path="billing" element={<Billing />} />
        <Route path="billing/quotations/:id" element={<QuotationEditor />} />
        <Route path="billing/invoices/:id" element={<InvoiceView />} />
        <Route path="billing/receipts/:no" element={<ReceiptView />} />
        <Route path="pharmacy" element={<Pharmacy />} />
        <Route path="pharmacy/prescriptions/:id" element={<PrescriptionView />} />
        <Route path="pharmacy/items/:id" element={<MedicationItem />} />
        <Route path="laboratory" element={<Laboratory />} />
        <Route path="laboratory/:id" element={<LabRequest />} />
        <Route path="staff" element={<Staff />} />
        <Route path="staff/reports/:dept/:month" element={<DepartmentReport />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
