import logging
from typing import Any, Dict, Optional

from langchain_core.documents import Document

from app.config import settings

logger = logging.getLogger(__name__)

_EMBEDDING_FALLBACKS = (
    "models/gemini-embedding-001",
    "models/gemini-embedding-2",
    "gemini-embedding-001",
)


def _embedding_model_candidates() -> list[str]:
    primary = (settings.openai_embedding_model or "text-embedding-3-small").strip()
    candidates = [primary]
    seen: set[str] = set()
    ordered: list[str] = []
    for name in candidates:
        if name and name not in seen:
            seen.add(name)
            ordered.append(name)
    return ordered


def _create_embeddings(api_key: str):
    from langchain_openai import OpenAIEmbeddings, AzureOpenAIEmbeddings

    if settings.azure_openai_endpoint and settings.azure_openai_api_key:
        try:
            embeddings = AzureOpenAIEmbeddings(
                azure_deployment=settings.azure_openai_embedding_deployment or "text-embedding-3-small",
                openai_api_version=settings.azure_openai_api_version,
                azure_endpoint=settings.azure_openai_endpoint,
                api_key=settings.azure_openai_api_key,
            )
            embeddings.embed_query("healthcheck")
            logger.info("rag.embeddings.ready type=azure")
            return embeddings
        except Exception as exc:
            raise RuntimeError(f"Azure embeddings failed: {exc}")

    last_error: Exception | None = None
    for model_name in _embedding_model_candidates():
        try:
            embeddings = OpenAIEmbeddings(
                model=model_name,
                openai_api_key=api_key,
            )
            # Probe once so bad model names fail at init, not on first chat.
            embeddings.embed_query("healthcheck")
            logger.info("rag.embeddings.ready model=%s", model_name)
            return embeddings
        except Exception as exc:
            last_error = exc
            logger.warning("rag.embeddings.skip model=%s err=%s", model_name, exc)
    if last_error:
        raise last_error
    raise RuntimeError("No embedding model configured")


class RAGService:
    def __init__(self):
        self.is_ready = False
        self.init_error: Optional[str] = None
        self.index_name = settings.pinecone_index_name
        self.embeddings = None
        self.employee_vector_store = None
        self.hr_vector_store = None

        is_azure = bool(settings.azure_openai_endpoint and settings.azure_openai_api_key)
        openai_api_key = settings.openai_api_key
        if not openai_api_key and not is_azure:
            self.init_error = "Missing OPENAI_API_KEY or Azure credentials; RAG context will be disabled."
            logger.warning(self.init_error)
            return

        try:
            from langchain_openai import OpenAIEmbeddings, AzureOpenAIEmbeddings

            # Support both legacy and current langchain-pinecone public APIs.
            try:
                from langchain_pinecone import PineconeVectorStore
            except ImportError:
                from langchain_pinecone import Pinecone as PineconeVectorStore
        except Exception as exc:
            self.init_error = f"RAG dependencies unavailable: {exc}"
            logger.warning(self.init_error)
            return

        try:
            self.embeddings = _create_embeddings(openai_api_key)

            # Use namespaces in one index to isolate employee and HR corpora.
            pinecone_kwargs = {"pinecone_api_key": settings.pinecone_api_key}
            self.employee_vector_store = PineconeVectorStore(
                index_name=self.index_name,
                embedding=self.embeddings,
                namespace="employee_data",
                **pinecone_kwargs,
            )
            self.hr_vector_store = PineconeVectorStore(
                index_name=self.index_name,
                embedding=self.embeddings,
                namespace="hr_data",
                **pinecone_kwargs,
            )
            self.is_ready = True
        except Exception as exc:
            self.init_error = f"Failed to initialize Pinecone vector stores: {exc}"
            logger.warning(self.init_error)

    def _should_disable_after_error(self, exc: Exception) -> bool:
        """Disable RAG when index/embedding config is fundamentally incompatible."""
        msg = str(exc).lower()
        return "vector dimension" in msg and "does not match" in msg

    def _disable_rag(self, reason: str) -> None:
        self.is_ready = False
        self.init_error = reason
        logger.warning("rag.disabled reason=%s", reason)

    async def ingest_employee_data(self, employee_id: str, content: str, metadata: Dict[str, Any] = None):
        """
        Stores employee-specific data in the Pinecone vector database.
        """
        if not self.is_ready or self.employee_vector_store is None:
            return

        if metadata is None:
            metadata = {}
        metadata["employee_id"] = employee_id
        
        doc = Document(page_content=content, metadata=metadata)
        try:
            # Use async add_documents if supported, or sync fallback
            await self.employee_vector_store.aadd_documents([doc])
        except Exception as exc:
            logger.warning("rag.ingest_employee.failed employee_id=%s err=%s", employee_id, exc)
            if self._should_disable_after_error(exc):
                self._disable_rag("Pinecone index dimension mismatch with embedding model.")
        
    async def retrieve_employee_context(self, employee_id: str, query: str, k: int = 3) -> str:
        """
        Retrieves relevant context for a specific employee from Pinecone.
        """
        if not self.is_ready or self.employee_vector_store is None:
            return ""

        try:
            docs = await self.employee_vector_store.asimilarity_search(
                query=query,
                k=k,
                filter={"employee_id": employee_id},
            )
            return "\n\n".join([doc.page_content for doc in docs])
        except Exception as exc:
            logger.warning("rag.retrieve_employee.failed employee_id=%s err=%s", employee_id, exc)
            return ""
        
    async def ingest_hr_data(self, org_id: str, content: str, metadata: Dict[str, Any] = None):
        """
        Stores organization-wide data for the HR chatbot in Pinecone.
        """
        if not self.is_ready or self.hr_vector_store is None:
            return

        if metadata is None:
            metadata = {}
        metadata["org_id"] = org_id
        
        doc = Document(page_content=content, metadata=metadata)
        try:
            await self.hr_vector_store.aadd_documents([doc])
        except Exception as exc:
            logger.warning("rag.ingest_hr.failed org_id=%s err=%s", org_id, exc)
            if self._should_disable_after_error(exc):
                self._disable_rag("Pinecone index dimension mismatch with embedding model.")

    async def retrieve_hr_context(self, org_id: str, query: str, k: int = 5) -> str:
        """
        Retrieves organization-wide context for the HR chatbot from Pinecone.
        """
        if not self.is_ready or self.hr_vector_store is None:
            return ""

        try:
            docs = await self.hr_vector_store.asimilarity_search(
                query=query,
                k=k,
                filter={"org_id": org_id},
            )
            return "\n\n".join([doc.page_content for doc in docs])
        except Exception as exc:
            logger.warning("rag.retrieve_hr.failed org_id=%s err=%s", org_id, exc)
            return ""

rag_service = RAGService()
