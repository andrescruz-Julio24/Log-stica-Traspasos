'use client';
import { Component } from 'react';

export class ViewBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="message error" role="alert">
        Esta vista no pudo mostrar sus datos.
        <button
          className="secondary"
          onClick={async () => {
            try {
              await this.props.reload();
              this.setState({ failed: false });
            } catch {
              /* La vista de carga muestra el error de consulta. */
            }
          }}
        >
          Reintentar vista
        </button>
      </section>
    );
  }
}
