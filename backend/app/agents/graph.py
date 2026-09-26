import logging
from typing import Optional
from app.agents.state import AgentState
from app.agents.nodes import AgentNodeExecutor

logger = logging.getLogger("opsara.agent.graph")


class IncidentResponseGraph:
    """Orchestrates the SRE agent workflow:

    Investigate -> Reason -> Propose -> Gate (Human Approval) -> Act -> Verify
    """

    def __init__(self, executor: Optional[AgentNodeExecutor] = None):
        self.executor = executor or AgentNodeExecutor()

    async def run_investigation(self, state: AgentState) -> AgentState:
        """Executes the investigation and reasoning pipeline up to the safety approval gate."""
        state = await self.executor.intake_node(state)
        state = await self.executor.investigate_node(state)
        state = await self.executor.analyze_node(state)
        state = await self.executor.decision_node(state)

        # If decision was to escalate immediately (e.g. database failure), do not propose mutation
        if state.final_status == "ESCALATED":
            return state

        # Evaluate risk and enforce approval gate
        state = await self.executor.risk_gate_node(state)
        return state

    async def resume_approved_action(self, state: AgentState) -> AgentState:
        """Resumes execution after explicit human operator approval has been granted."""
        state.approval_status = "APPROVED"
        state = await self.executor.execute_action_node(state)

        if state.final_status == "FAILED":
            return state

        state = await self.executor.verify_node(state)
        return state


_agent_graph_instance: Optional[IncidentResponseGraph] = None


def get_agent_graph() -> IncidentResponseGraph:
    global _agent_graph_instance
    if _agent_graph_instance is None:
        _agent_graph_instance = IncidentResponseGraph()
    return _agent_graph_instance
