// Stitch와 같은 Material Symbols Outlined 아이콘.
// 새 아이콘을 쓰면 index.html의 icon_names 목록에도 추가해야 한다.
export default function Icon({ name, fill = false, className = '' }) {
  return (
    <span aria-hidden="true" className={`material-symbols-outlined ${fill ? 'icon-fill' : ''} ${className}`}>
      {name}
    </span>
  );
}
