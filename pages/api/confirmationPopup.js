import React from 'react';
import styles from '../../styles/Home.module.css';

const ConfirmationPopup = ({ message, onConfirm, onCancel }) => {
  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popup}>
        <p>{message}</p>
        <div className={styles.buttons}>

          <button onClick={onConfirm} className={styles.confirmButton}>
            Confirmar
          </button>
          <button onClick={onCancel} className={styles.cancelButton}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationPopup;