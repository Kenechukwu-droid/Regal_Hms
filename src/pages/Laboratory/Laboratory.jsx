import ModuleScaffold from '../../components/common/ModuleScaffold';
import { MODULES } from '../../routes/modules';

export default function Laboratory() {
  return <ModuleScaffold module={MODULES.find((m) => m.id === 'laboratory')} features={['Test requests','Results',]} />;
}
