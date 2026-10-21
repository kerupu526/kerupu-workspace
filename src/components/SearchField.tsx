import Field from "./Field";
import NoopForm from "./NoopForm";
import styles from "./SearchField.module.css";

interface SearchFieldProps {
  id: string;
  /** 화면에는 보이지 않고 보조기기에만 읽히는 이름 */
  label: string;
  className?: string;
}

/* 검색창. 아직 검색 기능은 없다. */
export default function SearchField({ id, label, className }: SearchFieldProps) {
  return (
    <NoopForm role="search" className={className ? `${styles.search} ${className}` : styles.search}>
      <Field id={id} label={label} type="search" placeholder="검색" hideLabel />
    </NoopForm>
  );
}
