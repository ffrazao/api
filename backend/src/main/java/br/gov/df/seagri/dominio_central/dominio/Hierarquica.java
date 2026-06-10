package br.gov.df.seagri.dominio_central.dominio;

import java.util.Collection;

public interface Hierarquica<T> {
    T getPai();
    void setPai(T pai);
    Collection<T> getFilhos();
    void setFilhos(Collection<T> filhos);
    public void adicionarFilho(T filho);
    public void adicionarFilho(Collection<T> filhos);
    public void removerFilho();
    public void removerFilho(T filho);
    public void removerFilho(Collection<T> filhos);
}
