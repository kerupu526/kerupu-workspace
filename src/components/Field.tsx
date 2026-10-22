import styles from "./Field.module.css";

interface FieldProps {
  id: string;
  label: string;
  /** 한 줄 입력(기본) 또는 여러 줄 입력 */
  type?: "text" | "email" | "password" | "search" | "textarea";
  autoComplete?: string;
  placeholder?: string;
  /** 글자를 화면에서 숨기고 보조기기에만 읽히게 한다 (검색창처럼 모양이 이미 뜻을 말해 줄 때) */
  hideLabel?: boolean;
  /** 모달이 열릴 때 처음 포커스를 받는다 */
  autoFocus?: boolean;
  /** 폼으로 보내는 이름 (기본은 id) */
  name?: string;
  /** 처음 채워 둘 값 */
  defaultValue?: string;
  /** 필수 항목: 라벨 옆에 빨간 * 를 보이고, 보조기기에는 required 로 알린다 */
  required?: boolean;
  maxLength?: number;
}

/* 라벨과 입력창 한 쌍. 입력창 테두리는 card-border 가 아니라 main-logo 3px. */
export default function Field({
  id,
  label,
  type = "text",
  autoComplete,
  placeholder,
  hideLabel = false,
  autoFocus,
  name = id,
  defaultValue,
  required,
  maxLength,
}: FieldProps) {
  const multiline = type === "textarea";
  return (
    <div className={multiline ? `${styles.field} ${styles.grow}` : styles.field}>
      <label className={hideLabel ? "visually-hidden" : styles.label} htmlFor={id}>
        {label}
        {required && !hideLabel ? (
          <span className={styles.required} aria-hidden="true">
            {" "}
            *
          </span>
        ) : null}
      </label>
      {multiline ? (
        <textarea
          className={styles.textarea}
          id={id}
          name={name}
          placeholder={placeholder}
          autoFocus={autoFocus}
          defaultValue={defaultValue}
          required={required}
          maxLength={maxLength}
        />
      ) : (
        <input
          className={styles.input}
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          placeholder={placeholder}
          autoFocus={autoFocus}
          defaultValue={defaultValue}
          required={required}
          maxLength={maxLength}
        />
      )}
    </div>
  );
}
