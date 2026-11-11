import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
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
import Laboratory from '../pages/Laboratory/Laboratory';
import Staff from '../pages/Staff/Staff';

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
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
        <Route path="laboratory" element={<Laboratory />} />
        <Route path="staff" element={<Staff />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
