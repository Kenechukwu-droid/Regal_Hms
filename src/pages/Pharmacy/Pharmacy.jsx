import ModuleScaffold from '../../components/common/ModuleScaffold';
import { MODULES } from '../../routes/modules';

export default function Pharmacy() {
  return <ModuleScaffold module={MODULES.find((m) => m.id === 'pharmacy')} features={['Medication list','Inventory and reorder levels',]} />;
}
