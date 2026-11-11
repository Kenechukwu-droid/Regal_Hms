import PageHeader from './PageHeader';

export default function ModuleScaffold({ module, features = [] }) {
  return (
    <>
      <PageHeader title={module.label} subtitle={module.blurb} />
      <div className="scaffold">
        <h2>{module.priority === 'P0' ? 'Core module: build next' : 'Next-stage module'}</h2>
        <p>This page is wired into routing and role permissions. The screens below are still to build.</p>
        {features.length > 0 && <ul>{features.map((f) => <li key={f}>{f}</li>)}</ul>}
      </div>
    </>
  );
}
