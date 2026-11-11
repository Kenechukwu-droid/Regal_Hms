import ModuleScaffold from '../../components/common/ModuleScaffold';
import { MODULES } from '../../routes/modules';

export default function Photography() {
  return <ModuleScaffold module={MODULES.find((m) => m.id === 'photography')} features={['Before/after gallery','Photo consent controls',]} />;
}
