import ModuleScaffold from '../../components/common/ModuleScaffold';
import { MODULES } from '../../routes/modules';

export default function Staff() {
  return <ModuleScaffold module={MODULES.find((m) => m.id === 'staff')} features={['Staff directory','Analytics','Permissions',]} />;
}
