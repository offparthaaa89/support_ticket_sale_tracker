export const ME_QUERY = `
  query Me {
    me {
      id
      name
      email
      role
    }
  }
`;

export const LOGIN_MUTATION = `
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token

      user {
        id
        name
        email
        role
      }
    }
  }
`;

export const TICKETS_QUERY = `
  query Tickets(
    $filter: TicketFilterInput
    $take: Int!
    $cursor: String
  ) {
    tickets(
      filter: $filter
      take: $take
      cursor: $cursor
    ) {
      nodes {
        id
        title
        priority
        status
        slaDeadline
        slaState
        createdAt

        assignedAgent {
          id
          name
          email
          role
        }

        sla {
          firstResponseDueAt
          resolutionDueAt
          firstResponseState
          resolutionState
          overallState
          firstResponseRemainingMinutes
          resolutionRemainingMinutes
        }
      }

      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const DASHBOARD_QUERY = `
  query Dashboard {
    dashboard {
      openTickets
      inProgressTickets
      atRiskTickets
      breachedTickets
    }
  }
`;

export const AGENTS_QUERY = `
  query Agents {
    users(role: AGENT) {
      id
      name
      email
      role
    }
  }
`;

export const CREATE_TICKET_MUTATION = `
  mutation CreateTicket(
    $input: CreateTicketInput!
  ) {
    createTicket(input: $input) {
      id
      title
      priority
      status
    }
  }
`;

export const TICKET_QUERY = `
  query Ticket($id: ID!) {
    ticket(id: $id) {
      id
      title
      description
      priority
      status
      firstResponseAt
      resolvedAt
      slaDeadline
      slaState
      createdAt
      updatedAt

      creator {
        id
        name
        email
        role
      }

      assignedAgent {
        id
        name
        email
        role
      }

      sla {
        firstResponseDueAt
        resolutionDueAt
        firstResponseState
        resolutionState
        overallState
        firstResponseRemainingMinutes
        resolutionRemainingMinutes
      }

      comments {
        id
        content
        createdAt

        author {
          id
          name
          email
          role
        }
      }
    }
  }
`;

export const ADD_COMMENT_MUTATION = `
  mutation AddComment(
    $input: AddCommentInput!
  ) {
    addComment(input: $input) {
      id
      content
      createdAt

      author {
        id
        name
        email
        role
      }
    }
  }
`;

export const ASSIGN_TICKET_MUTATION = `
  mutation AssignTicket(
    $input: AssignTicketInput!
  ) {
    assignTicket(input: $input) {
      id

      assignedAgent {
        id
        name
        email
        role
      }
    }
  }
`;

export const UPDATE_TICKET_STATUS_MUTATION = `
  mutation UpdateTicketStatus(
    $input: UpdateTicketStatusInput!
  ) {
    updateTicketStatus: changeTicketStatus(
      input: $input
    ) {
      id
      status
    }
  }
`;

export const RESOLVE_TICKET_MUTATION = `
  mutation ResolveTicket($ticketId: ID!) {
    resolveTicket(ticketId: $ticketId) {
      id
      status
      resolvedAt

      sla {
        resolutionState
        resolutionRemainingMinutes
      }
    }
  }
`;